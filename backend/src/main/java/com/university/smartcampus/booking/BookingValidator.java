package com.university.smartcampus.booking;

import java.time.Duration;
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
    private final BookingDurationPolicy bookingDurationPolicy;

    public BookingValidator(BookingRepository bookingRepository, BookingDurationPolicy bookingDurationPolicy) {
        this.bookingRepository = bookingRepository;
        this.bookingDurationPolicy = bookingDurationPolicy;
    }

    public void requireActiveResource(ResourceEntity resource) {
        Objects.requireNonNull(resource, "Resource is required.");
        if (resource.getStatus() != ResourceStatus.ACTIVE) {
            throw new BadRequestException("Resource is not active.");
        }
    }

    public void requireResourceAvailableForBooking(ResourceEntity resource) {
        requireActiveResource(resource);
        if (!resource.isBookable()) {
            throw new BadRequestException("This resource is not available for booking.");
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

    public void validateDuration(ResourceEntity resource, Instant startTime, Instant endTime) {
        Objects.requireNonNull(resource, "Resource is required.");
        Objects.requireNonNull(startTime, "Start time is required.");
        Objects.requireNonNull(endTime, "End time is required.");

        String normalizedSubcategory = bookingDurationPolicy.normalizeSubcategory(resource.getSubcategory());
        Integer maxDurationMinutes = bookingDurationPolicy.getMaxDurationMinutes(normalizedSubcategory);
        long durationMinutes = Duration.between(startTime, endTime).toMinutes();

        if (maxDurationMinutes != null && durationMinutes > maxDurationMinutes) {
            throw new BadRequestException(
                "Maximum booking duration for this resource is " + (maxDurationMinutes / 60) + " hours"
            );
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

    public void ensureNoPendingOrApprovedOverlap(UUID resourceId, Instant startTime, Instant endTime, UUID bookingIdToExclude) {
        Objects.requireNonNull(resourceId, "Resource id is required.");
        Objects.requireNonNull(bookingIdToExclude, "Booking id is required.");
        boolean overlapping = bookingRepository.existsByResourceIdAndStatusInAndStartTimeLessThanAndEndTimeGreaterThanAndIdNot(
            resourceId,
            PENDING_OR_APPROVED,
            endTime,
            startTime,
            bookingIdToExclude
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
