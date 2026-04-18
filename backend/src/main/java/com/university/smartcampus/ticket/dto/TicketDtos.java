package com.university.smartcampus.ticket.dto;

import java.time.Instant;
import java.util.UUID;

import com.university.smartcampus.common.enums.AppEnums.TicketCategory;
import com.university.smartcampus.common.enums.AppEnums.TicketPriority;
import com.university.smartcampus.common.enums.AppEnums.TicketStatus;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class TicketDtos {

    private TicketDtos() {
    }

    public record CreateTicketRequest(
        @NotBlank String title,
        @NotBlank String description,
        @NotNull TicketCategory category,
        @NotNull TicketPriority priority,
        String contactNote
    ) {
    }

    public record UpdateTicketRequest(
        TicketPriority priority,
        String contactNote
    ) {
    }

    public record TicketStatusUpdateRequest(
        @NotNull TicketStatus newStatus,
        String note,
        UUID assignedTo,
        String resolutionNotes,
        String rejectionReason
    ) {
    }

    public record AddCommentRequest(
        @NotBlank String commentText
    ) {
    }

    public record AddTicketAttachmentRequest(
        @NotBlank @Size(max = 255) String fileName,
        @NotBlank @Size(max = 1000) String fileUrl,
        @NotBlank @Size(max = 100) String fileType
    ) {
    }

    public record TicketSummaryResponse(
        UUID id,
        String ticketCode,
        String title,
        TicketCategory category,
        TicketPriority priority,
        TicketStatus status,
        UUID reportedById,
        String reportedByEmail,
        UUID assignedToId,
        Instant createdAt
    ) {
    }

    public record TicketResponse(
        UUID id,
        String ticketCode,
        String title,
        String description,
        TicketCategory category,
        TicketPriority priority,
        TicketStatus status,
        UUID reportedById,
        String reportedByEmail,
        UUID assignedToId,
        String assignedToEmail,
        String resolutionNotes,
        String rejectionReason,
        String contactNote,
        Instant resolvedAt,
        Instant closedAt,
        Instant createdAt,
        Instant updatedAt
    ) {
    }

    public record TicketCommentResponse(
        UUID id,
        UUID ticketId,
        UUID userId,
        String userEmail,
        String commentText,
        boolean isEdited,
        Instant createdAt,
        Instant updatedAt
    ) {
    }

    public record TicketAttachmentResponse(
        UUID id,
        UUID ticketId,
        String fileName,
        String fileUrl,
        String fileType,
        Instant uploadedAt
    ) {
    }

    public record TicketStatusHistoryResponse(
        UUID id,
        UUID ticketId,
        TicketStatus oldStatus,
        TicketStatus newStatus,
        UUID changedById,
        String changedByEmail,
        String note,
        Instant changedAt
    ) {
    }
}
