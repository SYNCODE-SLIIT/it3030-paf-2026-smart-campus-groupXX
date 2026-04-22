package com.university.smartcampus.notification;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.university.smartcampus.notification.NotificationEnums.NotificationDeliveryStatus;
import com.university.smartcampus.notification.NotificationEnums.NotificationDomain;
import com.university.smartcampus.notification.NotificationEnums.NotificationSeverity;

public final class NotificationDtos {

    private NotificationDtos() {
    }

    public record NotificationLinkResponse(
        UUID ticketId,
        UUID ticketCommentId,
        UUID bookingId,
        UUID bookingModificationId,
        UUID resourceId,
        UUID locationId,
        UUID buildingId,
        UUID resourceTypeId,
        UUID userId
    ) {
    }

    public record NotificationResponse(
        UUID id,
        UUID eventId,
        NotificationDomain domain,
        String type,
        NotificationSeverity severity,
        String title,
        String body,
        UUID actorUserId,
        String actorEmail,
        String actionUrl,
        Instant createdAt,
        Instant readAt,
        Instant archivedAt,
        NotificationDeliveryStatus emailDeliveryStatus,
        List<NotificationLinkResponse> links
    ) {
    }

    public record NotificationUnreadCountResponse(
        long unreadCount
    ) {
    }

    public record NotificationPreferencesResponse(
        boolean inAppEnabled,
        boolean emailEnabled
    ) {
    }

    public record UpdateNotificationPreferencesRequest(
        Boolean inAppEnabled,
        Boolean emailEnabled
    ) {
    }

    public record NotificationDeliveryResponse(
        UUID id,
        UUID recipientId,
        UUID eventId,
        UUID recipientUserId,
        String recipientEmail,
        NotificationDomain domain,
        String type,
        NotificationSeverity severity,
        String title,
        NotificationDeliveryStatus status,
        int attemptCount,
        Instant nextAttemptAt,
        Instant sentAt,
        Instant failedAt,
        String failureReason,
        Instant createdAt
    ) {
    }
}
