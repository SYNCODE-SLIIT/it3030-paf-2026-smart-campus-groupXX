package com.university.smartcampus.resource;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

import javax.imageio.ImageIO;

import org.springframework.stereotype.Service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import com.university.smartcampus.common.exception.BadRequestException;
import com.university.smartcampus.config.SmartCampusProperties;

/**
 * Generates QR code PNGs for resources. The QR encodes only the student-facing
 * booking URL ({frontend-base-url}/book/resource/{resourceId}) so that scanning
 * redirects the student to the quick-booking page with the resource pre-selected.
 *
 * Nothing about the QR content is persisted; it is generated on demand.
 */
@Service
public class ResourceQrService {

    private static final int DEFAULT_SIZE = 512;
    private static final int MIN_SIZE = 128;
    private static final int MAX_SIZE = 1024;

    private final ResourceService resourceService;
    private final SmartCampusProperties properties;

    public ResourceQrService(ResourceService resourceService, SmartCampusProperties properties) {
        this.resourceService = resourceService;
        this.properties = properties;
    }

    public byte[] generateResourceQrPng(UUID resourceId, Integer requestedSize) {
        Objects.requireNonNull(resourceId, "Resource id is required.");

        // Validate resource exists (throws NotFoundException on miss).
        resourceService.getResourceById(resourceId);

        int size = clampSize(requestedSize);
        String url = buildBookingUrl(resourceId);
        return encode(url, size);
    }

    public String buildBookingUrl(UUID resourceId) {
        String base = normalizeBaseUrl(properties.getNotifications().getEmail().getActionBaseUrl());
        return base + "/book/resource/" + resourceId;
    }

    private String normalizeBaseUrl(String raw) {
        if (raw == null || raw.isBlank()) {
            return "http://localhost:3000";
        }

        String trimmed = raw.trim();
        while (trimmed.endsWith("/")) {
            trimmed = trimmed.substring(0, trimmed.length() - 1);
        }
        return trimmed;
    }

    private int clampSize(Integer requestedSize) {
        if (requestedSize == null) {
            return DEFAULT_SIZE;
        }
        if (requestedSize < MIN_SIZE) {
            return MIN_SIZE;
        }
        if (requestedSize > MAX_SIZE) {
            return MAX_SIZE;
        }
        return requestedSize;
    }

    private byte[] encode(String content, int size) {
        Map<EncodeHintType, Object> hints = Map.of(
            EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M,
            EncodeHintType.MARGIN, 1,
            EncodeHintType.CHARACTER_SET, "UTF-8"
        );

        try {
            BitMatrix matrix = new QRCodeWriter().encode(content, BarcodeFormat.QR_CODE, size, size, hints);
            try (ByteArrayOutputStream output = new ByteArrayOutputStream()) {
                ImageIO.write(MatrixToImageWriter.toBufferedImage(matrix), "PNG", output);
                return output.toByteArray();
            }
        } catch (WriterException | IOException exception) {
            throw new BadRequestException("We could not generate a QR code for this resource right now.");
        }
    }
}
