package com.university.smartcampus.booking;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.university.smartcampus.AppEnums.BookingStatus;
import com.university.smartcampus.AppEnums.ResourceCategory;
import com.university.smartcampus.AppEnums.ResourceStatus;
import com.university.smartcampus.common.exception.BadRequestException;
import com.university.smartcampus.resource.ResourceEntity;

@Component
public class BookingValidator {

    private static final LocalTime SPACES_BOOKING_WINDOW_START = LocalTime.of(8, 30);
    private static final LocalTime SPACES_BOOKING_WINDOW_END = LocalTime.of(17, 30);

    private static final List<BookingStatus> PENDING_OR_APPROVED = List.of(
        BookingStatus.PENDING,
        BookingStatus.APPROVED
    );

    private static final List<BookingStatus> APPROVED_ONLY = List.of(BookingStatus.APPROVED);

    private final BookingRepository bookingRepository;
    private final ZoneId bookingZoneId;

    public BookingValidator(
        BookingRepository bookingRepository,
        @Value("${app.booking.time-zone:Asia/Colombo}") String bookingTimeZone
    ) {
        this.bookingRepository = bookingRepository;
        this.bookingZoneId = ZoneId.of(bookingTimeZone);
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

        if (resource.getCategory() != ResourceCategory.SPACES) {
            return;
        }

        long durationMinutes = java.time.Duration.between(startTime, endTime).toMinutes();
        int maxDurationMinutes = 180;
        if (durationMinutes > maxDurationMinutes) {
            throw new BadRequestException(
                "Maximum booking duration for this resource is " + (maxDurationMinutes / 60) + " hours"
            );
        }
    }

    public void validateBookingWindow(ResourceEntity resource, Instant startTime, Instant endTime) {
        Objects.requireNonNull(resource, "Resource is required.");
        Objects.requireNonNull(startTime, "Start time is required.");
        Objects.requireNonNull(endTime, "End time is required.");

        if (resource.getCategory() != ResourceCategory.SPACES) {
            return;
        }

        ZonedDateTime startDateTime = startTime.atZone(bookingZoneId);
        ZonedDateTime endDateTime = endTime.atZone(bookingZoneId);

        if (!startDateTime.toLocalDate().equals(endDateTime.toLocalDate())) {
            throw new BadRequestException("Bookings for spaces must be between 8:30 AM and 5:30 PM.");
        }

        LocalTime bookingStart = startDateTime.toLocalTime();
        LocalTime bookingEnd = endDateTime.toLocalTime();

        if (bookingStart.isBefore(SPACES_BOOKING_WINDOW_START) || bookingEnd.isAfter(SPACES_BOOKING_WINDOW_END)) {
            throw new BadRequestException("Bookings for spaces must be between 8:30 AM and 5:30 PM.");
        }
    }

    public Instant getBookingWindowStart(ResourceEntity resource, LocalDate date, ZoneId zoneId) {
        Objects.requireNonNull(resource, "Resource is required.");
        Objects.requireNonNull(date, "Date is required.");
        Objects.requireNonNull(zoneId, "Zone id is required.");

        if (resource.getCategory() == ResourceCategory.SPACES) {
            return date.atTime(SPACES_BOOKING_WINDOW_START).atZone(zoneId).toInstant();
        }

        return date.atStartOfDay(zoneId).toInstant();
    }

    public Instant getBookingWindowEnd(ResourceEntity resource, LocalDate date, ZoneId zoneId) {
        Objects.requireNonNull(resource, "Resource is required.");
        Objects.requireNonNull(date, "Date is required.");
        Objects.requireNonNull(zoneId, "Zone id is required.");

        if (resource.getCategory() == ResourceCategory.SPACES) {
            return date.atTime(SPACES_BOOKING_WINDOW_END).atZone(zoneId).toInstant();
        }

        return date.plusDays(1).atStartOfDay(zoneId).toInstant();
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

    public ZoneId bookingZoneId() {
        return bookingZoneId;
    }
}
