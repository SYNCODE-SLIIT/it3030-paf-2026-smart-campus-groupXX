package com.university.smartcampus;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

import org.junit.jupiter.api.Test;

class SupabaseConnectivityTest {

	@Test
	void canConnectToSupabaseWithConfiguredDatasource() throws Exception {
		SupabaseConnectivitySupport.DatasourceConfig config = SupabaseConnectivitySupport.loadDatasourceConfig();

		assertTrue(
			config.url().startsWith("jdbc:postgresql://"),
			"SPRING_DATASOURCE_URL must be a JDBC PostgreSQL URL."
		);
		assertFalse(config.username().isBlank(), "SPRING_DATASOURCE_USERNAME is missing.");
		assertFalse(config.password().isBlank(), "SPRING_DATASOURCE_PASSWORD is missing.");

		try (
			Connection connection = DriverManager.getConnection(
				config.url(),
				config.username(),
				config.password()
			);
			Statement statement = connection.createStatement();
			ResultSet resultSet = statement.executeQuery("select 1")
		) {
			assertTrue(connection.isValid(5), "Connected, but the JDBC connection did not validate.");
			assertTrue(resultSet.next(), "Expected a row from select 1.");
			assertEquals(1, resultSet.getInt(1), "Unexpected result from select 1.");
		}
	}
}
