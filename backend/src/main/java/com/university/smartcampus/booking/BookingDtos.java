package com.university.smartcampus.booking;

import java.time.Instant;
import java.util.UUID;

import com.university.smartcampus.AppEnums.BookingStatus;
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
        BookingStatus status,
        Instant startTime,
        Instant endTime,
        String purpose,
        String rejectionReason,
        String cancellationReason,
        Instant decidedAt,
        Instant cancelledAt
    ) {
    }
}
