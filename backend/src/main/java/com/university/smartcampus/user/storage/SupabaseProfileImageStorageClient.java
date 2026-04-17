package com.university.smartcampus.user.storage;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
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

    private static final List<String> ALLOWED_PROFILE_IMAGE_TYPES = List.of(
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp");

    private final SmartCampusProperties properties;

    public SupabaseProfileImageStorageClient(SmartCampusProperties properties) {
        this.properties = properties;
    }

    @Override
    public StoredProfileImage storeStudentProfileImage(UUID userId, MultipartFile file) {
        ensureConfigured();

        String bucket = properties.getStorage().getProfileImages().getBucket().trim();
        String contentType = contentTypeFor(file);
        String extension = extensionFor(contentType);
        String objectPath = "students/%s/profile.%s".formatted(userId, extension);
        byte[] fileBytes;

        try {
            fileBytes = file.getBytes();
        } catch (IOException exception) {
            throw new ExternalServiceException("Failed to read the uploaded profile image.", exception);
        }

        try {
            uploadObject(bucket, objectPath, contentType, fileBytes);
        } catch (RestClientResponseException exception) {
            if (!isMissingBucket(exception)) {
                throw uploadException(exception);
            }

            createProfileImagesBucket(bucket);
            try {
                uploadObject(bucket, objectPath, contentType, fileBytes);
            } catch (RestClientResponseException retryException) {
                throw uploadException(retryException);
            } catch (RestClientException retryException) {
                throw new ExternalServiceException("Failed to upload the profile image to Supabase Storage.",
                        retryException);
            }
        } catch (RestClientException exception) {
            throw new ExternalServiceException("Failed to upload the profile image to Supabase Storage.", exception);
        }

        return new StoredProfileImage(publicUrl(bucket, objectPath), objectPath);
    }

    private void uploadObject(String bucket, String objectPath, String contentType, byte[] fileBytes) {
        restClient().post()
                .uri("/object/" + bucket + "/" + objectPath)
                .headers(headers -> applyStorageHeaders(headers, contentType))
                .body(fileBytes)
                .retrieve()
                .toBodilessEntity();
    }

    private void applyStorageHeaders(HttpHeaders headers, String contentType) {
        String serviceRoleKey = properties.getAuth().getSupabase().getServiceRoleKey();
        headers.setContentType(MediaType.parseMediaType(contentType));
        headers.set(HttpHeaders.AUTHORIZATION, "Bearer " + serviceRoleKey);
        headers.set("apikey", serviceRoleKey);
        headers.set("x-upsert", "true");
        headers.setCacheControl("public, max-age=3600");
    }

    private void createProfileImagesBucket(String bucket) {
        Map<String, Object> body = Map.of(
                "id", bucket,
                "name", bucket,
                "public", true,
                "file_size_limit", properties.getStorage().getProfileImages().getMaxSizeBytes(),
                "allowed_mime_types", ALLOWED_PROFILE_IMAGE_TYPES);

        try {
            restClient().post()
                    .uri("/bucket")
                    .headers(this::applyJsonStorageHeaders)
                    .body(body)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientResponseException exception) {
            if (!isBucketAlreadyExists(exception)) {
                throw uploadException(exception);
            }
        } catch (RestClientException exception) {
            throw new ExternalServiceException("Failed to create the Supabase profile image bucket.", exception);
        }
    }

    private void applyJsonStorageHeaders(HttpHeaders headers) {
        String serviceRoleKey = properties.getAuth().getSupabase().getServiceRoleKey();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set(HttpHeaders.AUTHORIZATION, "Bearer " + serviceRoleKey);
        headers.set("apikey", serviceRoleKey);
    }

    private String contentTypeFor(MultipartFile file) {
        return StringUtils.hasText(file.getContentType())
                ? file.getContentType()
                : MediaType.APPLICATION_OCTET_STREAM_VALUE;
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

    private boolean isMissingBucket(RestClientResponseException exception) {
        return exception.getStatusCode().value() == HttpStatus.NOT_FOUND.value()
                && exception.getResponseBodyAsString().toLowerCase(Locale.ROOT).contains("bucket not found");
    }

    private boolean isBucketAlreadyExists(RestClientResponseException exception) {
        String responseBody = exception.getResponseBodyAsString().toLowerCase(Locale.ROOT);
        return (exception.getStatusCode().value() == HttpStatus.CONFLICT.value()
                || exception.getStatusCode().value() == HttpStatus.BAD_REQUEST.value())
                && (responseBody.contains("already exists") || responseBody.contains("already_exist"));
    }

    private ExternalServiceException uploadException(RestClientResponseException exception) {
        String responseMessage = StringUtils.hasText(exception.getResponseBodyAsString())
                ? exception.getResponseBodyAsString()
                : exception.getStatusText();
        String suffix = StringUtils.hasText(responseMessage) ? " Supabase response: " + responseMessage : "";
        return new ExternalServiceException("Failed to upload the profile image to Supabase Storage." + suffix,
                exception);
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
