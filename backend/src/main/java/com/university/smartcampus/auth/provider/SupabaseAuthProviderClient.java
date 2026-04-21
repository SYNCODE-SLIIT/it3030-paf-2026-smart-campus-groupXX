package com.university.smartcampus.auth.provider;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;

import com.university.smartcampus.common.enums.AppEnums.AuthDeliveryMethod;
import com.university.smartcampus.common.exception.ExternalServiceException;
import com.university.smartcampus.config.SmartCampusProperties;

@Component
@ConditionalOnProperty(prefix = "app.auth.delivery", name = "mode", havingValue = "supabase", matchIfMissing = true)
public class SupabaseAuthProviderClient implements AuthProviderClient {

    private static final String INVITE_FLOW_QUERY_PARAM = "flow";
    private static final String INVITE_FLOW_VALUE = "invite";
    private static final String INVITE_EMAIL_QUERY_PARAM = "invite_email";

    private final SmartCampusProperties properties;

    public SupabaseAuthProviderClient(SmartCampusProperties properties) {
        this.properties = properties;
    }

    @Override
    public DeliveryResult sendInviteLink(String email) {
        String redirectUri = withInviteRedirectContext(properties.getAuth().getSupabase().getInviteRedirectTo(), email);

        try {
            sendInviteEmail(email, redirectUri);
            return new DeliveryResult(AuthDeliveryMethod.INVITE_EMAIL, null, redirectUri);
        } catch (ExternalServiceException exception) {
            // Existing auth identities cannot receive invite links; fall back to a
            // login-link email for the same address.
            if (isEmailAlreadyRegistered(exception)) {
                sendMagicLinkEmail(email, redirectUri);
                return new DeliveryResult(AuthDeliveryMethod.LOGIN_LINK_EMAIL, null, redirectUri);
            }

            throw exception;
        }
    }

    private String withInviteRedirectContext(String redirectUri, String inviteEmail) {
        if (!StringUtils.hasText(redirectUri)) {
            return redirectUri;
        }

        try {
            String normalizedEmail = normalizeEmail(inviteEmail);

            return UriComponentsBuilder.fromUriString(redirectUri)
                    .replaceQueryParam(INVITE_FLOW_QUERY_PARAM, INVITE_FLOW_VALUE)
                    .replaceQueryParam(INVITE_EMAIL_QUERY_PARAM, normalizedEmail)
                    .build(true)
                    .toUriString();
        } catch (IllegalArgumentException exception) {
            return redirectUri;
        }
    }

    private String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }

    @Override
    public DeliveryResult sendMagicLink(String email) {
        String redirectUri = properties.getAuth().getSupabase().getMagicLinkRedirectTo();
        sendMagicLinkEmail(email, redirectUri);
        return new DeliveryResult(AuthDeliveryMethod.LOGIN_LINK_EMAIL, null, redirectUri);
    }

    private void sendInviteEmail(String email, String redirectUri) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("email", email);
        if (StringUtils.hasText(redirectUri)) {
            body.put("redirect_to", redirectUri);
        }
        sendAuthEmail("/invite", body, "Failed to send an invite email through Supabase.");
    }

    private void sendMagicLinkEmail(String email, String redirectUri) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("email", email);
        body.put("create_user", false);
        if (StringUtils.hasText(redirectUri)) {
            body.put("email_redirect_to", redirectUri);
        }
        sendAuthEmail("/otp", body, "Failed to send a sign-in email through Supabase.");
    }

    private void sendAuthEmail(String path, Map<String, Object> body, String failureMessage) {
        ensureConfigured();

        try {
            restClient().post()
                    .uri(path)
                    .headers(headers -> {
                        headers.setContentType(MediaType.APPLICATION_JSON);
                        headers.set(HttpHeaders.AUTHORIZATION,
                                "Bearer " + properties.getAuth().getSupabase().getServiceRoleKey());
                        headers.set("apikey", properties.getAuth().getSupabase().getServiceRoleKey());
                    })
                    .body(body)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientResponseException exception) {
            String responseMessage = exception.getResponseBodyAsString();
            String suffix = StringUtils.hasText(responseMessage) ? " Supabase response: " + responseMessage : "";
            throw new ExternalServiceException(failureMessage + suffix,
                    exception);
        } catch (RestClientException exception) {
            throw new ExternalServiceException(failureMessage, exception);
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
}
