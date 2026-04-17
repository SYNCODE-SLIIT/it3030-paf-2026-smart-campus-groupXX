package com.university.smartcampus.booking;

import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

import org.springframework.stereotype.Component;

import com.university.smartcampus.AppEnums.BookingStatus;
import com.university.smartcampus.AppEnums.ResourceStatus;
import com.university.smartcampus.common.exception.BadRequestException;
import com.university.smartcampus.resource.ResourceEntity;

@Component
public class BookingValidator {

    private static final List<BookingStatus> PENDING_OR_APPROVED = List.of(
        BookingStatus.PENDING,
        BookingStatus.APPROVED
    );

    private static final List<BookingStatus> APPROVED_ONLY = List.of(BookingStatus.APPROVED);

    private final BookingRepository bookingRepository;

    public BookingValidator(BookingRepository bookingRepository) {
        this.bookingRepository = bookingRepository;
    }

    public void requireActiveResource(ResourceEntity resource) {
        Objects.requireNonNull(resource, "Resource is required.");
        if (resource.getStatus() != ResourceStatus.ACTIVE) {
            throw new BadRequestException("Resource is not active.");
        }
    }

    public void validateTimeRange(Instant startTime, Instant endTime) {
        Objects.requireNonNull(startTime, "Start time is required.");
        Objects.requireNonNull(endTime, "End time is required.");
        if (!startTime.isBefore(endTime)) {
            throw new BadRequestException("Start time must be before end time.");
        }
    }

    public void requireFutureStart(Instant startTime) {
        if (!startTime.isAfter(Instant.now())) {
            throw new BadRequestException("Start time must be in the future.");
        }
    }

    public void ensureNoPendingOrApprovedOverlap(UUID resourceId, Instant startTime, Instant endTime) {
        Objects.requireNonNull(resourceId, "Resource id is required.");
        boolean overlapping = bookingRepository.existsByResourceIdAndStatusInAndStartTimeLessThanAndEndTimeGreaterThan(
            resourceId,
            PENDING_OR_APPROVED,
            endTime,
            startTime
        );
        if (overlapping) {
            throw new BadRequestException("This resource already has a booking in the requested time range.");
        }
    }

    public void ensureNoApprovedOverlap(UUID resourceId, Instant startTime, Instant endTime, UUID bookingIdToExclude) {
        Objects.requireNonNull(resourceId, "Resource id is required.");
        Objects.requireNonNull(bookingIdToExclude, "Booking id is required.");
        boolean overlapping = bookingRepository.existsByResourceIdAndStatusInAndStartTimeLessThanAndEndTimeGreaterThanAndIdNot(
            resourceId,
            APPROVED_ONLY,
            endTime,
            startTime,
            bookingIdToExclude
        );
        if (overlapping) {
            throw new BadRequestException("This resource already has an approved booking in the requested time range.");
        }
    }

    public Instant currentInstant() {
        return Instant.now();
    }
}
