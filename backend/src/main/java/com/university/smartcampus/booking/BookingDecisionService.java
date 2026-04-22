package com.university.smartcampus.booking;

import java.util.Objects;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.transaction.annotation.Transactional;

import com.university.smartcampus.AppEnums.BookingStatus;
import com.university.smartcampus.booking.BookingDtos.BookingDecisionRequest;
import com.university.smartcampus.booking.BookingDtos.CancelBookingRequest;
import com.university.smartcampus.booking.BookingDtos.BookingResponse;
import com.university.smartcampus.common.exception.BadRequestException;
import com.university.smartcampus.user.entity.UserEntity;

@Service
public class BookingDecisionService {

    private final BookingRepository bookingRepository;
    private final BookingValidator bookingValidator;
    private final BookingService bookingService;
    private final BookingNotificationService notificationService;
    private final BookingResourceAvailabilityService bookingResourceAvailabilityService;

    public BookingDecisionService(
        BookingRepository bookingRepository,
        BookingValidator bookingValidator,
        BookingService bookingService,
        BookingNotificationService notificationService,
        BookingResourceAvailabilityService bookingResourceAvailabilityService
    ) {
        this.bookingRepository = bookingRepository;
        this.bookingValidator = bookingValidator;
        this.bookingService = bookingService;
        this.notificationService = notificationService;
        this.bookingResourceAvailabilityService = bookingResourceAvailabilityService;
    }

    @Transactional
    public BookingResponse approveBooking(UUID bookingId, UserEntity approver) {
        Objects.requireNonNull(approver, "Approver is required.");
        BookingEntity booking = bookingService.requireBooking(bookingId);
        requirePending(booking);
        bookingResourceAvailabilityService.ensureResourceAvailableForProgression(booking);
        bookingValidator.ensureNoApprovedOverlap(
            booking.getResource().getId(),
            booking.getStartTime(),
            booking.getEndTime(),
            booking.getId()
        );
        booking.setStatus(BookingStatus.APPROVED);
        booking.setApprovedBy(approver);
        booking.setDecidedAt(bookingValidator.currentInstant());
        booking.setRejectionReason(null);
        BookingEntity saved = bookingRepository.save(booking);
        notificationService.notifyBookingApproved(saved);
        return bookingService.toResponse(saved);
    }

    @Transactional
    public BookingResponse rejectBooking(UUID bookingId, UserEntity approver, BookingDecisionRequest request) {
        Objects.requireNonNull(approver, "Approver is required.");
        BookingEntity booking = bookingService.requireBooking(bookingId);
        requirePending(booking);
        String reason = normalizeReason(request == null ? null : request.reason());
        if (!StringUtils.hasText(reason)) {
            throw new BadRequestException("A rejection reason is required.");
        }
        booking.setStatus(BookingStatus.REJECTED);
        booking.setApprovedBy(approver);
        booking.setDecidedAt(bookingValidator.currentInstant());
        booking.setRejectionReason(reason);
        BookingEntity saved = bookingRepository.save(booking);
        notificationService.notifyBookingRejected(saved);
        return bookingService.toResponse(saved);
    }

    @Transactional
    public BookingResponse cancelApprovedBooking(UUID bookingId, CancelBookingRequest request) {
        BookingEntity booking = bookingService.requireBooking(bookingId);
        if (booking.getStatus() != BookingStatus.APPROVED) {
            throw new BadRequestException("Only approved bookings can be cancelled through this action.");
        }
        booking.setStatus(BookingStatus.CANCELLED);
        booking.setCancellationReason(normalizeReason(request == null ? null : request.reason()));
        booking.setCancelledAt(bookingValidator.currentInstant());
        BookingEntity saved = bookingRepository.save(booking);
        notificationService.notifyBookingCancelled(saved);
        return bookingService.toResponse(saved);
    }

    private void requirePending(BookingEntity booking) {
        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new BadRequestException("Only pending bookings can transition to this state.");
        }
    }

    private String normalizeReason(String reason) {
        return StringUtils.hasText(reason) ? reason.trim() : null;
    }
}
