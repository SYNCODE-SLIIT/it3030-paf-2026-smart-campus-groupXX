package com.university.smartcampus.booking;

import java.time.Instant;
import java.util.List;
import java.util.Objects;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.university.smartcampus.AppEnums.BookingStatus;
import com.university.smartcampus.common.exception.BadRequestException;

@Service
public class BookingResourceAvailabilityService {

    private static final String UNAVAILABLE_REASON = "Booking cancelled because the resource is no longer available for booking.";

    private final BookingRepository bookingRepository;
    private final BookingNotificationService notificationService;
    private final BookingValidator bookingValidator;

    public BookingResourceAvailabilityService(
        BookingRepository bookingRepository,
        BookingNotificationService notificationService,
        BookingValidator bookingValidator
    ) {
        this.bookingRepository = bookingRepository;
        this.notificationService = notificationService;
        this.bookingValidator = bookingValidator;
    }

    @Transactional
    public void reconcileFutureBookings(List<BookingEntity> bookings) {
        if (bookings == null || bookings.isEmpty()) {
            return;
        }
        for (BookingEntity booking : bookings) {
            cancelIfFutureAndUnavailable(booking);
        }
    }

    @Transactional
    public void ensureResourceAvailableForProgression(BookingEntity booking) {
        Objects.requireNonNull(booking, "Booking is required.");
        if (cancelIfFutureAndUnavailable(booking)) {
            throw new BadRequestException("Booking was automatically cancelled because the resource is no longer available for booking.");
        }
        bookingValidator.requireResourceAvailableForBooking(booking.getResource());
    }

    private boolean cancelIfFutureAndUnavailable(BookingEntity booking) {
        Objects.requireNonNull(booking, "Booking is required.");

        if (!isAutoCancelable(booking)) {
            return false;
        }

        if (isResourceAvailableForBooking(booking)) {
            return false;
        }

        Instant now = bookingValidator.currentInstant();
        booking.setStatus(BookingStatus.CANCELLED);
        booking.setCancellationReason(UNAVAILABLE_REASON);
        booking.setCancelledAt(now);
        BookingEntity saved = bookingRepository.save(booking);
        notificationService.notifyBookingCancelled(saved);
        return true;
    }

    private boolean isAutoCancelable(BookingEntity booking) {
        BookingStatus status = booking.getStatus();
        if (status != BookingStatus.PENDING && status != BookingStatus.APPROVED) {
            return false;
        }
        Instant startTime = booking.getStartTime();
        return startTime != null && startTime.isAfter(bookingValidator.currentInstant());
    }

    private boolean isResourceAvailableForBooking(BookingEntity booking) {
        return booking.getResource() != null
            && booking.getResource().getStatus() == com.university.smartcampus.AppEnums.ResourceStatus.ACTIVE
            && booking.getResource().isBookable();
    }
}