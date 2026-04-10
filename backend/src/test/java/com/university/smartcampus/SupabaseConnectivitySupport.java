package com.university.smartcampus;

import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;

final class SupabaseConnectivitySupport {

	private SupabaseConnectivitySupport() {
	}

	static DatasourceConfig loadDatasourceConfig() throws IOException {
		Map<String, String> values = new HashMap<>(loadDotEnv());
		values.putAll(System.getenv());

		String url = values.get("SPRING_DATASOURCE_URL");
		String username = values.get("SPRING_DATASOURCE_USERNAME");
		String password = values.get("SPRING_DATASOURCE_PASSWORD");

		assertNotNull(url, "SPRING_DATASOURCE_URL is missing.");
		assertNotNull(username, "SPRING_DATASOURCE_USERNAME is missing.");
		assertNotNull(password, "SPRING_DATASOURCE_PASSWORD is missing.");

		return new DatasourceConfig(url, username, password);
	}

	private static Map<String, String> loadDotEnv() throws IOException {
		Map<String, String> values = new HashMap<>();
		Path dotEnvPath = Path.of("..", ".env");

		if (!Files.exists(dotEnvPath)) {
			return values;
		}

		for (String rawLine : Files.readAllLines(dotEnvPath)) {
			String line = rawLine.trim();

			if (line.isEmpty() || line.startsWith("#") || !line.contains("=")) {
				continue;
			}

			int separatorIndex = line.indexOf('=');
			String key = line.substring(0, separatorIndex).trim();
			String value = line.substring(separatorIndex + 1).trim();

			values.put(key, stripWrappingQuotes(value));
		}

		return values;
	}

	private static String stripWrappingQuotes(String value) {
		if (value.length() >= 2) {
			char first = value.charAt(0);
			char last = value.charAt(value.length() - 1);

			if ((first == '"' && last == '"') || (first == '\'' && last == '\'')) {
				return value.substring(1, value.length() - 1);
			}
		}

		return value;
	}

	record DatasourceConfig(String url, String username, String password) {
	}
}
