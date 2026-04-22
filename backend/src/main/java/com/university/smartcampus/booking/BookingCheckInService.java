package com.university.smartcampus.booking;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.university.smartcampus.AppEnums.BookingStatus;
import com.university.smartcampus.AppEnums.CheckInStatus;
import com.university.smartcampus.common.exception.BadRequestException;
import com.university.smartcampus.common.exception.ForbiddenException;
import com.university.smartcampus.common.exception.NotFoundException;
import com.university.smartcampus.user.entity.UserEntity;

@Service
public class BookingCheckInService {

    private final BookingRepository bookingRepository;
    private final BookingValidator bookingValidator;
    private final BookingResourceAvailabilityService bookingResourceAvailabilityService;

    public BookingCheckInService(
        BookingRepository bookingRepository,
        BookingValidator bookingValidator,
        BookingResourceAvailabilityService bookingResourceAvailabilityService
    ) {
        this.bookingRepository = bookingRepository;
        this.bookingValidator = bookingValidator;
        this.bookingResourceAvailabilityService = bookingResourceAvailabilityService;
    }

    @Transactional
    public BookingDtos.CheckInResponse checkInBooking(UserEntity user, UUID bookingId) {
        Objects.requireNonNull(user, "User is required.");
        Objects.requireNonNull(bookingId, "Booking ID is required.");

        BookingEntity booking = bookingRepository.findById(bookingId)
            .orElseThrow(() -> new NotFoundException("Booking not found."));

        // Only resource owner/manager or requester can check in
        if (!booking.getRequester().getId().equals(user.getId())) {
            throw new ForbiddenException("You cannot check in this booking.");
        }

        if (booking.getStatus() != BookingStatus.APPROVED) {
            throw new BadRequestException("Only approved bookings can be checked in.");
        }

        bookingResourceAvailabilityService.ensureResourceAvailableForProgression(booking);

        Instant now = bookingValidator.currentInstant();
        if (now.isBefore(booking.getStartTime())) {
            throw new BadRequestException("Booking has not started yet. Check-in is only available during booking time.");
        }

        booking.setCheckInStatus(CheckInStatus.CHECKED_IN);
        booking.setCheckedInAt(now);
        booking.setStatus(BookingStatus.CHECKED_IN);
        
        BookingEntity saved = bookingRepository.save(booking);
        return new BookingDtos.CheckInResponse(
            saved.getId(),
            saved.getCheckInStatus(),
            saved.getCheckedInAt()
        );
    }

    @Transactional
    public BookingDtos.CheckInResponse markNoShow(UUID bookingId) {
        Objects.requireNonNull(bookingId, "Booking ID is required.");

        BookingEntity booking = bookingRepository.findById(bookingId)
            .orElseThrow(() -> new NotFoundException("Booking not found."));

        if (booking.getStatus() != BookingStatus.APPROVED && booking.getStatus() != BookingStatus.CHECKED_IN) {
            throw new BadRequestException("Only approved or checked-in bookings can be marked as no-show.");
        }

        Instant now = bookingValidator.currentInstant();
        if (now.isBefore(booking.getEndTime())) {
            throw new BadRequestException("Booking time has not ended yet.");
        }

        booking.setCheckInStatus(CheckInStatus.NO_SHOW);
        booking.setStatus(BookingStatus.NO_SHOW);
        
        BookingEntity saved = bookingRepository.save(booking);
        return new BookingDtos.CheckInResponse(
            saved.getId(),
            saved.getCheckInStatus(),
            saved.getCheckedInAt()
        );
    }

    @Transactional
    public BookingDtos.CheckInResponse completeBooking(UUID bookingId) {
        Objects.requireNonNull(bookingId, "Booking ID is required.");

        BookingEntity booking = bookingRepository.findById(bookingId)
            .orElseThrow(() -> new NotFoundException("Booking not found."));

        if (booking.getStatus() != BookingStatus.CHECKED_IN) {
            throw new BadRequestException("Only checked-in bookings can be completed.");
        }

        Instant now = bookingValidator.currentInstant();
        if (now.isBefore(booking.getEndTime())) {
            throw new BadRequestException("Booking time has not ended yet. Wait until booking end time to complete.");
        }

        booking.setStatus(BookingStatus.COMPLETED);
        
        BookingEntity saved = bookingRepository.save(booking);
        return new BookingDtos.CheckInResponse(
            saved.getId(),
            saved.getCheckInStatus(),
            saved.getCheckedInAt()
        );
    }

    @Transactional(readOnly = true)
    public BookingDtos.CheckInResponse getCheckInStatus(UUID bookingId) {
        BookingEntity booking = bookingRepository.findById(bookingId)
            .orElseThrow(() -> new NotFoundException("Booking not found."));
        
        return new BookingDtos.CheckInResponse(
            booking.getId(),
            booking.getCheckInStatus(),
            booking.getCheckedInAt()
        );
    }
}
