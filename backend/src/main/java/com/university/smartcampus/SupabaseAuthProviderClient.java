package com.university.smartcampus;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import com.university.smartcampus.AppEnums.AuthDeliveryMethod;
import com.university.smartcampus.ExternalServiceException;

@Component
@ConditionalOnProperty(prefix = "app.auth.delivery", name = "mode", havingValue = "supabase", matchIfMissing = true)
public class SupabaseAuthProviderClient implements AuthProviderClient {

    private final SmartCampusProperties properties;

    public SupabaseAuthProviderClient(SmartCampusProperties properties) {
        this.properties = properties;
    }

    @Override
    public DeliveryResult sendInviteLink(String email) {
        String redirectUri = properties.getAuth().getSupabase().getInviteRedirectTo();

        try {
            return generateLink(
                "invite",
                email,
                AuthDeliveryMethod.INVITE_EMAIL,
                redirectUri
            );
        } catch (ExternalServiceException exception) {
            // Existing auth identities cannot receive invite links; fall back to a generated magic link.
            if (isEmailAlreadyRegistered(exception)) {
                return generateLink(
                    "magiclink",
                    email,
                    AuthDeliveryMethod.LOGIN_LINK_EMAIL,
                    redirectUri
                );
            }

            throw exception;
        }
    }

    @Override
    public DeliveryResult sendMagicLink(String email) {
        return generateLink(
            "magiclink",
            email,
            AuthDeliveryMethod.LOGIN_LINK_EMAIL,
            properties.getAuth().getSupabase().getMagicLinkRedirectTo()
        );
    }

    @SuppressWarnings("unchecked")
    private DeliveryResult generateLink(
        String type,
        String email,
        AuthDeliveryMethod deliveryMethod,
        String redirectUri
    ) {
        ensureConfigured();

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("type", type);
        body.put("email", email);

        if (StringUtils.hasText(redirectUri)) {
            body.put("redirect_to", redirectUri);
        }

        try {
            Map<String, Object> response = restClient().post()
                .uri("/admin/generate_link")
                .headers(headers -> {
                    headers.setContentType(MediaType.APPLICATION_JSON);
                    headers.set(HttpHeaders.AUTHORIZATION, "Bearer " + properties.getAuth().getSupabase().getServiceRoleKey());
                    headers.set("apikey", properties.getAuth().getSupabase().getServiceRoleKey());
                })
                .body(body)
                .retrieve()
                .body(Map.class);

            String authReference = null;
            if (response != null) {
                Map<String, Object> propertiesMap = response.get("properties") instanceof Map<?, ?> nested
                    ? (Map<String, Object>) nested
                    : null;
                authReference = firstNonBlank(
                    (String) response.get("action_link"),
                    propertiesMap == null ? null : (String) propertiesMap.get("action_link"),
                    (String) response.get("email")
                );
            }

            return new DeliveryResult(deliveryMethod, authReference, redirectUri);
        } catch (RestClientResponseException exception) {
            String responseMessage = exception.getResponseBodyAsString();
            String suffix = StringUtils.hasText(responseMessage) ? " Supabase response: " + responseMessage : "";
            throw new ExternalServiceException("Failed to generate an auth access link through Supabase." + suffix, exception);
        } catch (RestClientException exception) {
            throw new ExternalServiceException("Failed to generate an auth access link through Supabase.", exception);
        }
    }

    private boolean isEmailAlreadyRegistered(ExternalServiceException exception) {
        Throwable cause = exception.getCause();

        if (!(cause instanceof RestClientResponseException responseException)) {
            return false;
        }

        if (responseException.getStatusCode().value() != 422) {
            return false;
        }

        String responseBody = responseException.getResponseBodyAsString();
        return responseBody != null && responseBody.toLowerCase().contains("email_exists");
    }

    private RestClient restClient() {
        return RestClient.builder()
            .baseUrl(trimTrailingSlash(properties.getAuth().getSupabase().getUrl()) + "/auth/v1")
            .build();
    }

    private void ensureConfigured() {
        if (!StringUtils.hasText(properties.getAuth().getSupabase().getUrl())
            || !StringUtils.hasText(properties.getAuth().getSupabase().getServiceRoleKey())) {
            throw new ExternalServiceException("Supabase auth delivery is not configured.");
        }
    }

    private String trimTrailingSlash(String input) {
        return input.endsWith("/") ? input.substring(0, input.length() - 1) : input;
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value;
            }
        }
        return null;
    }
}
