package com.university.smartcampus.contact.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class ContactDtos {

    private ContactDtos() {
    }

    public record SubmitContactMessageRequest(
        @NotBlank @Size(max = 200) String fullName,
        @NotBlank @Email @Size(max = 320) String email,
        @Size(max = 50) String phone,
        @NotBlank @Size(max = 300) String title,
        @NotBlank @Size(max = 8000) String message
    ) {
    }

    public record ContactSubmissionResponse(UUID id, String acknowledgement) {
    }

    public record ContactMessageResponse(
        UUID id,
        String fullName,
        String email,
        String phone,
        String title,
        String message,
        Instant createdAt
    ) {
    }

    public record ContactMessagePageResponse(
        List<ContactMessageResponse> items,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean hasNext
    ) {
    }
}
