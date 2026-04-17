package com.university.smartcampus.user.storage;

import java.io.IOException;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.multipart.MultipartFile;

import com.university.smartcampus.common.exception.ExternalServiceException;
import com.university.smartcampus.config.SmartCampusProperties;

@Component
public class SupabaseProfileImageStorageClient implements ProfileImageStorageClient {

    private final SmartCampusProperties properties;

    public SupabaseProfileImageStorageClient(SmartCampusProperties properties) {
        this.properties = properties;
    }

    @Override
    public StoredProfileImage storeStudentProfileImage(UUID userId, MultipartFile file) {
        ensureConfigured();

        String bucket = properties.getStorage().getProfileImages().getBucket();
        String contentType = StringUtils.hasText(file.getContentType())
                ? file.getContentType()
                : MediaType.APPLICATION_OCTET_STREAM_VALUE;
        String serviceRoleKey = properties.getAuth().getSupabase().getServiceRoleKey();
        String extension = extensionFor(contentType);
        String objectPath = "students/%s/profile.%s".formatted(userId, extension);

        try {
            restClient().post()
                    .uri("/object/" + bucket + "/" + objectPath)
                    .contentType(MediaType.parseMediaType(contentType))
                    .header("apikey", serviceRoleKey)
                    .header("authorization", "Bearer " + serviceRoleKey)
                    .header("x-upsert", "true")
                    .header(HttpHeaders.CACHE_CONTROL, "public, max-age=3600")
                    .body(file.getBytes())
                    .retrieve()
                    .toBodilessEntity();
        } catch (IOException exception) {
            throw new ExternalServiceException("Failed to read the uploaded profile image.", exception);
        } catch (RestClientResponseException exception) {
            String response = StringUtils.hasText(exception.getResponseBodyAsString())
                    ? exception.getResponseBodyAsString()
                    : exception.getStatusText();
            throw new ExternalServiceException(
                    "Failed to upload the profile image to Supabase Storage: " + response,
                    exception);
        } catch (RestClientException exception) {
            throw new ExternalServiceException("Failed to upload the profile image to Supabase Storage.", exception);
        }

        return new StoredProfileImage(publicUrl(bucket, objectPath), objectPath);
    }

    private String publicUrl(String bucket, String objectPath) {
        String baseUrl = trimTrailingSlash(properties.getAuth().getSupabase().getUrl());
        return "%s/storage/v1/object/public/%s/%s?v=%d".formatted(
                baseUrl,
                bucket,
                objectPath,
                Instant.now().toEpochMilli());
    }

    private String extensionFor(String contentType) {
        String normalized = contentType == null ? "" : contentType.toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "image/jpeg", "image/jpg" -> "jpg";
            case "image/png" -> "png";
            case "image/webp" -> "webp";
            default -> "jpg";
        };
    }

    private RestClient restClient() {
        return RestClient.builder()
                .baseUrl(trimTrailingSlash(properties.getAuth().getSupabase().getUrl()) + "/storage/v1")
                .build();
    }

    private void ensureConfigured() {
        if (!StringUtils.hasText(properties.getAuth().getSupabase().getUrl())
                || !StringUtils.hasText(properties.getAuth().getSupabase().getServiceRoleKey())
                || !StringUtils.hasText(properties.getStorage().getProfileImages().getBucket())) {
            throw new ExternalServiceException("Supabase profile image storage is not configured.");
        }
    }

    private String trimTrailingSlash(String input) {
        return input.endsWith("/") ? input.substring(0, input.length() - 1) : input;
    }
}
