package com.university.smartcampus;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.UUID;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;

public abstract class AbstractPostgresIntegrationTest {

    private static final String LOCAL_SECRET = "test-local-hs256-secret-for-resource-server";
    private static org.testcontainers.containers.PostgreSQLContainer<?> postgresql;

    @DynamicPropertySource
    static void registerProperties(DynamicPropertyRegistry registry) {
        String testDatasourceUrl = System.getenv("TEST_DATASOURCE_URL");
        String testDatasourceUsername = System.getenv("TEST_DATASOURCE_USERNAME");
        String testDatasourcePassword = System.getenv("TEST_DATASOURCE_PASSWORD");

        if (hasText(testDatasourceUrl) && hasText(testDatasourceUsername) && testDatasourcePassword != null) {
            registry.add("spring.datasource.url", () -> testDatasourceUrl);
            registry.add("spring.datasource.username", () -> testDatasourceUsername);
            registry.add("spring.datasource.password", () -> testDatasourcePassword);
        } else {
            registry.add("spring.datasource.url", () -> getPostgresql().getJdbcUrl());
            registry.add("spring.datasource.username", () -> getPostgresql().getUsername());
            registry.add("spring.datasource.password", () -> getPostgresql().getPassword());
        }

        registry.add("app.security.jwt.local-secret", () -> LOCAL_SECRET);
        registry.add("app.bootstrap.admin.email", () -> "");
    }

    protected RequestPostProcessor jwtFor(String email) {
        return jwt().jwt(jwt -> jwt
            .subject(authUserIdFor(email).toString())
            .claim("email", email)
        );
    }

    protected UUID authUserIdFor(String email) {
        String normalizedEmail = email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
        return UUID.nameUUIDFromBytes(("test-auth:" + normalizedEmail).getBytes(StandardCharsets.UTF_8));
    }

    private static org.testcontainers.containers.PostgreSQLContainer<?> getPostgresql() {
        if (postgresql == null) {
            postgresql = new org.testcontainers.containers.PostgreSQLContainer<>("postgres:16-alpine");
            postgresql.start();
        }
        return postgresql;
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
