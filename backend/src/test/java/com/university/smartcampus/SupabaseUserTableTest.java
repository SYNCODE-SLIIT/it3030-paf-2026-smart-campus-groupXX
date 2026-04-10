package com.university.smartcampus;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.Test;

class SupabaseUserTableTest {

	@Test
	void canCreateSimpleUserTableAndPersistRow() throws Exception {
		SupabaseConnectivitySupport.DatasourceConfig config = SupabaseConnectivitySupport.loadDatasourceConfig();
		String id = UUID.randomUUID().toString();
		String email = "codex-test-" + Instant.now().toEpochMilli() + "@example.com";
		String name = "Codex Smoke User";
		String emailHash = sha256Hex(email);

		try (
			Connection connection = DriverManager.getConnection(
				config.url(),
				config.username(),
				config.password()
			)
		) {
			createUsersTableIfNeeded(connection);
			insertUser(connection, id, email, name, emailHash);
			assertStoredUser(connection, email, name);
			deleteUser(connection, email);
		}
	}

	private void createUsersTableIfNeeded(Connection connection) throws Exception {
		String sql = """
			create table if not exists app_users (
				id uuid primary key,
				email varchar(255) not null unique,
				full_name varchar(255) not null,
				email_hash varchar(64) not null unique,
				created_at timestamptz not null default now()
			)
			""";

		try (Statement statement = connection.createStatement()) {
			statement.execute(sql);
		}
	}

	private void insertUser(
		Connection connection,
		String id,
		String email,
		String fullName,
		String emailHash
	) throws Exception {
		String sql = """
			insert into app_users (id, email, full_name, email_hash)
			values (?::uuid, ?, ?, ?)
			on conflict (email) do update
			set id = excluded.id,
			    full_name = excluded.full_name,
			    email_hash = excluded.email_hash
			""";

		try (PreparedStatement statement = connection.prepareStatement(sql)) {
			statement.setString(1, id);
			statement.setString(2, email);
			statement.setString(3, fullName);
			statement.setString(4, emailHash);
			assertEquals(1, statement.executeUpdate(), "Expected one app_users row to be inserted or updated.");
		}
	}

	private void assertStoredUser(Connection connection, String email, String expectedName) throws Exception {
		String sql = "select full_name from app_users where email = ?";

		try (PreparedStatement statement = connection.prepareStatement(sql)) {
			statement.setString(1, email);

			try (ResultSet resultSet = statement.executeQuery()) {
				assertTrue(resultSet.next(), "Expected the inserted user to be present in app_users.");
				assertEquals(expectedName, resultSet.getString("full_name"));
			}
		}
	}

	private void deleteUser(Connection connection, String email) throws Exception {
		String sql = "delete from app_users where email = ?";

		try (PreparedStatement statement = connection.prepareStatement(sql)) {
			statement.setString(1, email);
			statement.executeUpdate();
		}
	}

	private String sha256Hex(String value) throws Exception {
		MessageDigest digest = MessageDigest.getInstance("SHA-256");
		byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
		StringBuilder builder = new StringBuilder(hash.length * 2);

		for (byte current : hash) {
			builder.append(String.format("%02x", current));
		}

		return builder.toString();
	}
}
