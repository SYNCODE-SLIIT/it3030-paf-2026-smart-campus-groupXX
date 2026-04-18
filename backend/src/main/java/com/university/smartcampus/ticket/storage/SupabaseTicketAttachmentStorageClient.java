package com.university.smartcampus.ticket.storage;

import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.regex.Pattern;

import org.springframework.http.HttpHeaders;
import org.springframework.http.InvalidMediaTypeException;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.util.UriUtils;

import com.university.smartcampus.common.exception.BadRequestException;
import com.university.smartcampus.common.exception.ExternalServiceException;
import com.university.smartcampus.config.SmartCampusProperties;

@Component
public class SupabaseTicketAttachmentStorageClient implements TicketAttachmentStorageClient {

    private static final Pattern SAFE_FILE_CHARS = Pattern.compile("[^A-Za-z0-9._-]");
    private static final int MAX_FILE_NAME_LENGTH = 180;
    private static final int MAX_FILE_TYPE_LENGTH = 100;

    private final SmartCampusProperties properties;
    private final AtomicBoolean bucketReady = new AtomicBoolean(false);

    public SupabaseTicketAttachmentStorageClient(SmartCampusProperties properties) {
        this.properties = properties;
    }

    @Override
    public StoredAttachment upload(UUID ticketId, MultipartFile file) {
        ensureConfigured();
        validateFile(file);
        ensureBucketExists();

        String fileName = sanitizedFileName(file.getOriginalFilename());
        String fileType = normalizedFileType(file.getContentType());
        String objectPath = "tickets/" + ticketId + "/" + UUID.randomUUID() + "-" + fileName;

        try {
            restClient().post()
                    .uri(objectUri(objectPath))
                    .headers(headers -> applySupabaseHeaders(headers))
                    .contentType(MediaType.parseMediaType(fileType))
                    .body(file.getBytes())
                    .retrieve()
                    .toBodilessEntity();
        } catch (IOException exception) {
            throw new BadRequestException("Could not read uploaded attachment file.");
        } catch (RestClientResponseException exception) {
            throw storageException("Failed to upload ticket attachment to Supabase Storage.", exception);
        } catch (RestClientException exception) {
            throw new ExternalServiceException("Failed to upload ticket attachment to Supabase Storage.", exception);
        }

        return new StoredAttachment(fileName, publicUrl(objectPath), fileType);
    }

    @Override
    public void deleteByPublicUrl(String fileUrl) {
        if (!StringUtils.hasText(fileUrl) || !isConfigured()) {
            return;
        }

        String objectPath = objectPathFromPublicUrl(fileUrl);
        if (!StringUtils.hasText(objectPath)) {
            return;
        }

        try {
            restClient().delete()
                    .uri(objectUri(objectPath))
                    .headers(headers -> applySupabaseHeaders(headers))
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientResponseException exception) {
            throw storageException("Failed to delete ticket attachment from Supabase Storage.", exception);
        } catch (RestClientException exception) {
            throw new ExternalServiceException("Failed to delete ticket attachment from Supabase Storage.", exception);
        }
    }

    private void ensureBucketExists() {
        if (bucketReady.get()) {
            return;
        }

        synchronized (bucketReady) {
            if (bucketReady.get()) {
                return;
            }

            SmartCampusProperties.TicketAttachments attachments = attachmentsProperties();
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("id", bucket());
            body.put("name", bucket());
            body.put("public", attachments.isPublicBucket());
            if (attachments.getFileSizeLimitBytes() > 0) {
                body.put("file_size_limit", attachments.getFileSizeLimitBytes());
            }

            try {
                restClient().post()
                        .uri("/bucket")
                        .headers(headers -> {
                            applySupabaseHeaders(headers);
                            headers.setContentType(MediaType.APPLICATION_JSON);
                        })
                        .body(body)
                        .retrieve()
                        .toBodilessEntity();
                bucketReady.set(true);
            } catch (RestClientResponseException exception) {
                if (isAlreadyExists(exception)) {
                    bucketReady.set(true);
                    return;
                }
                throw storageException("Failed to create Supabase Storage bucket for ticket attachments.", exception);
            } catch (RestClientException exception) {
                throw new ExternalServiceException(
                        "Failed to create Supabase Storage bucket for ticket attachments.", exception);
            }
        }
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Attachment file is required.");
        }

        long limit = attachmentsProperties().getFileSizeLimitBytes();
        if (limit > 0 && file.getSize() > limit) {
            throw new BadRequestException("Attachment file is too large.");
        }
    }

    private String sanitizedFileName(String originalFileName) {
        String fallback = "attachment";
        String value = StringUtils.hasText(originalFileName) ? originalFileName.trim() : fallback;
        value = value.replace("\\", "/");
        int lastSlash = value.lastIndexOf('/');
        if (lastSlash >= 0) {
            value = value.substring(lastSlash + 1);
        }

        value = Normalizer.normalize(value, Normalizer.Form.NFKD);
        value = SAFE_FILE_CHARS.matcher(value).replaceAll("_");
        value = value.replaceAll("_+", "_");
        value = value.replaceAll("^[._-]+", "");

        if (!StringUtils.hasText(value)) {
            value = fallback;
        }
        if (value.length() > MAX_FILE_NAME_LENGTH) {
            value = value.substring(value.length() - MAX_FILE_NAME_LENGTH);
        }

        return value;
    }

    private String normalizedFileType(String contentType) {
        String value = StringUtils.hasText(contentType) ? contentType.trim() : MediaType.APPLICATION_OCTET_STREAM_VALUE;
        if (value.length() > MAX_FILE_TYPE_LENGTH) {
            throw new BadRequestException("Attachment file type is too long.");
        }
        try {
            MediaType.parseMediaType(value);
            return value;
        } catch (InvalidMediaTypeException exception) {
            return MediaType.APPLICATION_OCTET_STREAM_VALUE;
        }
    }

    private String objectUri(String objectPath) {
        return "/object/" + encodedPathSegment(bucket()) + "/" + encodedPath(objectPath);
    }

    private String publicUrl(String objectPath) {
        return storageBaseUrl() + "/object/public/" + encodedPathSegment(bucket()) + "/" + encodedPath(objectPath);
    }

    private String objectPathFromPublicUrl(String fileUrl) {
        URI uri;
        try {
            uri = URI.create(fileUrl);
        } catch (IllegalArgumentException exception) {
            return null;
        }

        URI storageUri = URI.create(storageBaseUrl());
        if (!sameOrigin(uri, storageUri)) {
            return null;
        }

        String expectedPrefix = URI.create(storageBaseUrl()).getRawPath()
                + "/object/public/" + encodedPathSegment(bucket()) + "/";
        String rawPath = uri.getRawPath();
        if (rawPath == null || !rawPath.startsWith(expectedPrefix)) {
            return null;
        }

        return UriUtils.decode(rawPath.substring(expectedPrefix.length()), StandardCharsets.UTF_8);
    }

    private boolean sameOrigin(URI first, URI second) {
        return java.util.Objects.equals(first.getScheme(), second.getScheme())
                && java.util.Objects.equals(first.getHost(), second.getHost())
                && first.getPort() == second.getPort();
    }

    private String encodedPath(String value) {
        return UriUtils.encodePath(value, StandardCharsets.UTF_8);
    }

    private String encodedPathSegment(String value) {
        return UriUtils.encodePathSegment(value, StandardCharsets.UTF_8);
    }

    private RestClient restClient() {
        return RestClient.builder()
                .baseUrl(storageBaseUrl())
                .build();
    }

    private void applySupabaseHeaders(HttpHeaders headers) {
        String serviceRoleKey = properties.getAuth().getSupabase().getServiceRoleKey();
        headers.setBearerAuth(serviceRoleKey);
        headers.set("apikey", serviceRoleKey);
    }

    private ExternalServiceException storageException(String message, RestClientResponseException exception) {
        String responseBody = exception.getResponseBodyAsString();
        String suffix = StringUtils.hasText(responseBody) ? " Supabase response: " + responseBody : "";
        return new ExternalServiceException(message + suffix, exception);
    }

    private boolean isAlreadyExists(RestClientResponseException exception) {
        int status = exception.getStatusCode().value();
        if (status != 400 && status != 409) {
            return false;
        }
        String body = exception.getResponseBodyAsString();
        return body != null && body.toLowerCase().contains("exist");
    }

    private void ensureConfigured() {
        if (!isConfigured()) {
            throw new ExternalServiceException("Supabase Storage is not configured for ticket attachments.");
        }
        if (!StringUtils.hasText(bucket())) {
            throw new ExternalServiceException("Ticket attachment storage bucket is not configured.");
        }
    }

    private boolean isConfigured() {
        return StringUtils.hasText(properties.getAuth().getSupabase().getUrl())
                && StringUtils.hasText(properties.getAuth().getSupabase().getServiceRoleKey());
    }

    private String bucket() {
        return attachmentsProperties().getBucket();
    }

    private SmartCampusProperties.TicketAttachments attachmentsProperties() {
        return properties.getStorage().getTicketAttachments();
    }

    private String storageBaseUrl() {
        return trimTrailingSlash(properties.getAuth().getSupabase().getUrl()) + "/storage/v1";
    }

    private String trimTrailingSlash(String input) {
        return input.endsWith("/") ? input.substring(0, input.length() - 1) : input;
    }
}
