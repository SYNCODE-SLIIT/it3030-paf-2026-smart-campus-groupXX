package com.university.smartcampus.booking;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

import com.university.smartcampus.AppEnums.BookingStatus;
import com.university.smartcampus.AppEnums.CheckInStatus;
import com.university.smartcampus.AppEnums.ModificationStatus;
import com.university.smartcampus.AppEnums.NotificationType;
import com.university.smartcampus.AppEnums.RecurrencePattern;
import com.university.smartcampus.resource.ResourceDtos;

public final class BookingDtos {

    private BookingDtos() {
    }

    public record CreateBookingRequest(
        UUID resourceId,
        Instant startTime,
        Instant endTime,
        String purpose
    ) {
    }

    public record BookingDecisionRequest(
        String reason
    ) {
    }

    public record CancelBookingRequest(
        String reason
    ) {
    }

    public record BookingResponse(
        UUID id,
        ResourceDtos.ResourceSummary resource,
        UUID requesterId,
        String requesterRegistrationNumber,
        BookingStatus status,
        Instant startTime,
        Instant endTime,
        String purpose,
        String rejectionReason,
        String cancellationReason,
        Instant decidedAt,
        Instant cancelledAt,
        CheckInStatus checkInStatus,
        Instant checkedInAt
    ) {
    }

    public record TimeRange(
        Instant startTime,
        Instant endTime
    ) {
    }

    public record ResourceRemainingRangesResponse(
        UUID resourceId,
        LocalDate date,
        Instant windowStart,
        Instant windowEnd,
        List<TimeRange> remainingRanges
    ) {
    }

    // Recurring Booking DTOs
    public record CreateRecurringBookingRequest(
        UUID resourceId,
        RecurrencePattern recurrencePattern,
        Instant startDate,
        Instant endDate,
        Integer occurrenceCount,
        LocalTime startTime,
        LocalTime endTime,
        String purpose
    ) {
    }

    public record RecurringBookingResponse(
        UUID id,
        ResourceDtos.ResourceSummary resource,
        UUID requesterId,
        RecurrencePattern recurrencePattern,
        Instant startDate,
        Instant endDate,
        Integer occurrenceCount,
        LocalTime startTime,
        LocalTime endTime,
        String purpose,
        boolean active,
        Instant createdAt
    ) {
    }

    // Booking Modification DTOs
    public record RequestModificationRequest(
        Instant requestedStartTime,
        Instant requestedEndTime,
        String reason
    ) {
    }

    public record ModificationDecisionRequest(
        String decisionReason
    ) {
    }

    public record BookingModificationResponse(
        UUID id,
        UUID bookingId,
        Instant requestedStartTime,
        Instant requestedEndTime,
        String reason,
        ModificationStatus status,
        Instant decidedAt,
        String decisionReason
    ) {
    }

    // Check-in DTOs
    public record CheckInRequest(
        String notes
    ) {
    }

    public record CheckInResponse(
        UUID bookingId,
        CheckInStatus checkInStatus,
        Instant checkedInAt
    ) {
    }

    // Notification DTOs
    public record BookingNotificationResponse(
        UUID id,
        UUID bookingId,
        NotificationType notificationType,
        Instant sentAt,
        Instant readAt,
        boolean emailSent,
        boolean smsSent
    ) {
    }
}

