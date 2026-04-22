package com.university.smartcampus.ticket.dto;

import java.time.Instant;
import java.util.UUID;

import com.university.smartcampus.common.enums.AppEnums.TicketCategory;
import com.university.smartcampus.common.enums.AppEnums.TicketPriority;
import com.university.smartcampus.common.enums.AppEnums.TicketStatus;

import org.springframework.hateoas.server.core.Relation;

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
        String contactNote,
        UUID resourceId
    ) {
        public CreateTicketRequest(
            String title,
            String description,
            TicketCategory category,
            TicketPriority priority,
            String contactNote
        ) {
            this(title, description, category, priority, contactNote, null);
        }
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

    public record UpdateCommentRequest(
        @NotBlank String commentText
    ) {
    }

    public record AddTicketAttachmentRequest(
        @NotBlank @Size(max = 255) String fileName,
        @NotBlank @Size(max = 1000) String fileUrl,
        @NotBlank @Size(max = 100) String fileType
    ) {
    }

    public record AssignTicketRequest(
        @NotNull UUID assignedTo
    ) {
    }

    public enum TicketAnalyticsBucket {
        DAY,
        WEEK,
        MONTH
    }

    public record TicketAnalyticsSlaRow(
        TicketPriority priority,
        long total,
        long compliant,
        Double complianceRate,
        long targetMinutes
    ) {
    }

    public record TicketAnalyticsSla(
        java.util.List<TicketAnalyticsSlaRow> ttfrCompliance,
        java.util.List<TicketAnalyticsSlaRow> ttrCompliance,
        Double overallTtfrComplianceRate,
        Double overallTtrComplianceRate
    ) {
    }

    public record TicketAnalyticsResponse(
        Instant from,
        Instant to,
        TicketAnalyticsBucket bucket,
        TicketAnalyticsSummary summary,
        TicketAnalyticsTiming timing,
        TicketAnalyticsCommunication communication,
        TicketAnalyticsAssignment assignment,
        java.util.List<TicketAnalyticsBreakdownRow> statusBreakdown,
        java.util.List<TicketAnalyticsBreakdownRow> priorityBreakdown,
        java.util.List<TicketAnalyticsBreakdownRow> categoryBreakdown,
        java.util.List<TicketAnalyticsTrendPoint> trends,
        java.util.List<TicketAnalyticsAttentionTicket> attentionTickets,
        java.util.List<TicketAnalyticsStatusEvent> recentStatusEvents,
        java.util.List<TicketAnalyticsManagerPerformance> managerPerformance,
        TicketAnalyticsSla sla
    ) {
    }

    public record TicketAnalyticsSummary(
        long totalTickets,
        long activeBacklog,
        long open,
        long inProgress,
        long resolved,
        long closed,
        long rejected,
        long unassignedOpen,
        long urgentActive,
        Double positiveResolutionRate,
        Double rejectionRate
    ) {
    }

    public record TicketAnalyticsTiming(
        Double averageActiveAgeMinutes,
        Double averageTimeToAssignMinutes,
        Double averageTimeToAcceptMinutes,
        Double averageTimeToResolveMinutes,
        Double averageTimeInProgressMinutes,
        Double averageClosureLagMinutes
    ) {
    }

    public record TicketAnalyticsCommunication(
        long totalComments,
        Double averageCommentsPerTicket,
        long ticketsWithAttachments,
        long totalAttachments,
        Double averageAttachmentsPerTicket
    ) {
    }

    public record TicketAnalyticsAssignment(
        long totalAssignmentEvents,
        long reassignmentEvents,
        long ticketsAssignedInWindow
    ) {
    }

    public record TicketAnalyticsBreakdownRow(
        String key,
        String label,
        long count,
        Double percentage
    ) {
    }

    public record TicketAnalyticsTrendPoint(
        Instant bucketStart,
        Instant bucketEnd,
        long created,
        long resolved,
        long rejected,
        long activeBacklog
    ) {
    }

    public record TicketAnalyticsAttentionTicket(
        UUID id,
        String ticketCode,
        String title,
        TicketCategory category,
        TicketPriority priority,
        TicketStatus status,
        UUID assignedToId,
        String assignedToName,
        String reportedByEmail,
        Instant createdAt,
        Instant lastStatusChangedAt,
        long ageMinutes,
        String reason
    ) {
    }

    public record TicketAnalyticsStatusEvent(
        UUID id,
        UUID ticketId,
        String ticketCode,
        String title,
        TicketStatus oldStatus,
        TicketStatus newStatus,
        UUID changedById,
        String changedByEmail,
        String note,
        Instant changedAt
    ) {
    }

    public record TicketAnalyticsManagerPerformance(
        UUID assigneeId,
        String assigneeName,
        String assigneeEmail,
        long assignedTotal,
        long active,
        long urgentActive,
        long resolvedClosed,
        long rejected,
        Double averageTimeToAcceptMinutes,
        Double averageTimeToResolveMinutes,
        long assignmentEvents,
        long reassignmentEvents
    ) {
    }

    @Relation(itemRelation = "ticket", collectionRelation = "tickets")
    public record TicketSummaryResponse(
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
        String assignedToName,
        Instant createdAt
    ) {
    }

    @Relation(itemRelation = "ticket", collectionRelation = "tickets")
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
        String assignedToName,
        UUID resourceId,
        UUID locationId,
        String resolutionNotes,
        String rejectionReason,
        String contactNote,
        Instant resolvedAt,
        Instant closedAt,
        Instant createdAt,
        Instant updatedAt
    ) {
    }

    @Relation(itemRelation = "comment", collectionRelation = "comments")
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

    @Relation(itemRelation = "attachment", collectionRelation = "attachments")
    public record TicketAttachmentResponse(
        UUID id,
        UUID ticketId,
        String fileName,
        String fileUrl,
        String fileType,
        Instant uploadedAt
    ) {
    }

    @Relation(itemRelation = "statusHistoryEntry", collectionRelation = "statusHistory")
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
