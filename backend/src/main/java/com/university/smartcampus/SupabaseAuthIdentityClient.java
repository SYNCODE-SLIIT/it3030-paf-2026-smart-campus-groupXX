package com.university.smartcampus;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import com.university.smartcampus.ExternalServiceException;

@Component
public class SupabaseAuthIdentityClient implements AuthIdentityClient {

    private final SmartCampusProperties properties;

    public SupabaseAuthIdentityClient(SmartCampusProperties properties) {
        this.properties = properties;
    }

    @Override
    @SuppressWarnings("unchecked")
    public ProvisionedIdentity provisionPasswordIdentity(String email, UUID existingAuthUserId, String password) {
        ensureConfigured();

        try {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("email", email);
            body.put("password", password);
            body.put("email_confirm", true);

            Map<String, Object> response;
            boolean created = false;
            UUID targetAuthUserId = findAuthUserIdByEmail(email).orElse(existingAuthUserId);

            if (targetAuthUserId == null) {
                response = restClient().post()
                    .uri("/admin/users")
                    .headers(this::applyAdminHeaders)
                    .body(body)
                    .retrieve()
                    .body(Map.class);
                created = true;
            } else {
                response = restClient().put()
                    .uri("/admin/users/{id}", targetAuthUserId)
                    .headers(this::applyAdminHeaders)
                    .body(body)
                    .retrieve()
                    .body(Map.class);
            }

            UUID authUserId = extractAuthUserId(response, targetAuthUserId);
            return new ProvisionedIdentity(authUserId, created);
        } catch (RestClientException exception) {
            throw new ExternalServiceException("Failed to provision email and password access through Supabase.", exception);
        }
    }

    @Override
    public void deleteIdentity(UUID authUserId, String email) {
        ensureConfigured();

        UUID targetAuthUserId = authUserId;
        if (targetAuthUserId == null && StringUtils.hasText(email)) {
            targetAuthUserId = findAuthUserIdByEmail(email).orElse(null);
        }

        if (targetAuthUserId == null) {
            return;
        }

        try {
            restClient().delete()
                .uri("/admin/users/{id}", targetAuthUserId)
                .headers(this::applyAdminHeaders)
                .retrieve()
                .toBodilessEntity();
        } catch (RestClientResponseException exception) {
            if (exception.getStatusCode().value() == 404) {
                return;
            }
            throw new ExternalServiceException("Failed to delete auth identity through Supabase.", exception);
        } catch (RestClientException exception) {
            throw new ExternalServiceException("Failed to delete auth identity through Supabase.", exception);
        }
    }

    private RestClient restClient() {
        return RestClient.builder()
            .baseUrl(trimTrailingSlash(properties.getAuth().getSupabase().getUrl()) + "/auth/v1")
            .build();
    }

    private void applyAdminHeaders(HttpHeaders headers) {
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set(HttpHeaders.AUTHORIZATION, "Bearer " + properties.getAuth().getSupabase().getServiceRoleKey());
        headers.set("apikey", properties.getAuth().getSupabase().getServiceRoleKey());
    }

    private UUID extractAuthUserId(Map<String, Object> response, UUID fallback) {
        if (response != null) {
            Object id = response.get("id");
            if (id instanceof String idValue && StringUtils.hasText(idValue)) {
                return UUID.fromString(idValue);
            }
        }

        if (fallback != null) {
            return fallback;
        }

        throw new ExternalServiceException("Supabase auth user id was not returned.");
    }

    @SuppressWarnings("unchecked")
    private Optional<UUID> findAuthUserIdByEmail(String email) {
        Map<String, Object> response = restClient().get()
            .uri(uriBuilder -> uriBuilder
                .path("/admin/users")
                .queryParam("page", 1)
                .queryParam("per_page", 1000)
                .build())
            .headers(this::applyAdminHeaders)
            .retrieve()
            .body(Map.class);

        if (response == null) {
            return Optional.empty();
        }

        Object usersObject = response.get("users");
        if (!(usersObject instanceof List<?> users)) {
            return Optional.empty();
        }

        return users.stream()
            .filter(Map.class::isInstance)
            .map(Map.class::cast)
            .filter(user -> email.equalsIgnoreCase((String) user.get("email")))
            .map(user -> user.get("id"))
            .filter(String.class::isInstance)
            .map(String.class::cast)
            .filter(StringUtils::hasText)
            .map(UUID::fromString)
            .findFirst();
    }

    private void ensureConfigured() {
        if (!StringUtils.hasText(properties.getAuth().getSupabase().getUrl())
            || !StringUtils.hasText(properties.getAuth().getSupabase().getServiceRoleKey())) {
            throw new ExternalServiceException("Supabase auth identity provisioning is not configured.");
        }
    }

    private String trimTrailingSlash(String input) {
        return input.endsWith("/") ? input.substring(0, input.length() - 1) : input;
    }
}
