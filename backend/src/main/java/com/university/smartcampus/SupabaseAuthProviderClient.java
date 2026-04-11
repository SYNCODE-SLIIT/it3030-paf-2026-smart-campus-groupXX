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

import com.university.smartcampus.AppEnums.AuthDeliveryMethod;
import com.university.smartcampus.Exceptions.ExternalServiceException;

@Component
@ConditionalOnProperty(prefix = "app.auth.delivery", name = "mode", havingValue = "supabase", matchIfMissing = true)
public class SupabaseAuthProviderClient implements AuthProviderClient {

    private final SmartCampusProperties properties;

    public SupabaseAuthProviderClient(SmartCampusProperties properties) {
        this.properties = properties;
    }

    @Override
    public DeliveryResult sendInviteLink(String email) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("email", email);

        if (StringUtils.hasText(properties.getAuth().getSupabase().getInviteRedirectTo())) {
            body.put("redirect_to", properties.getAuth().getSupabase().getInviteRedirectTo());
        }

        return post(
            "/invite",
            body,
            AuthDeliveryMethod.INVITE_EMAIL,
            properties.getAuth().getSupabase().getInviteRedirectTo()
        );
    }

    @Override
    public DeliveryResult sendMagicLink(String email) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("email", email);
        body.put("create_user", false);

        return post(
            "/otp",
            body,
            AuthDeliveryMethod.LOGIN_LINK_EMAIL,
            properties.getAuth().getSupabase().getMagicLinkRedirectTo()
        );
    }

    @SuppressWarnings("unchecked")
    private DeliveryResult post(
        String path,
        Map<String, Object> body,
        AuthDeliveryMethod deliveryMethod,
        String redirectUri
    ) {
        ensureConfigured();

        try {
            Map<String, Object> response = restClient().post()
                .uri(path)
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
                authReference = firstNonBlank(
                    (String) response.get("action_link"),
                    (String) response.get("email"),
                    (String) response.get("id")
                );
            }

            return new DeliveryResult(deliveryMethod, authReference, redirectUri);
        } catch (RestClientException exception) {
            throw new ExternalServiceException("Failed to send auth email through Supabase.", exception);
        }
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
