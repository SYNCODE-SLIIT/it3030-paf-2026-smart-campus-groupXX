package com.university.smartcampus.booking;

import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.transaction.annotation.Transactional;

import com.university.smartcampus.AppEnums.BookingStatus;
import com.university.smartcampus.common.exception.BadRequestException;
import com.university.smartcampus.common.exception.ForbiddenException;
import com.university.smartcampus.common.exception.NotFoundException;
import com.university.smartcampus.resource.ResourceEntity;
import com.university.smartcampus.resource.ResourceService;
import com.university.smartcampus.user.entity.UserEntity;

@Service
public class BookingService {

    private final BookingRepository bookingRepository;
    private final ResourceService resourceService;
    private final BookingValidator bookingValidator;

    public BookingService(
        BookingRepository bookingRepository,
        ResourceService resourceService,
        BookingValidator bookingValidator
    ) {
        this.bookingRepository = bookingRepository;
        this.resourceService = resourceService;
        this.bookingValidator = bookingValidator;
    }

    public BookingDtos.BookingResponse createBooking(UserEntity requester, BookingDtos.CreateBookingRequest request) {
        Objects.requireNonNull(requester, "Requester is required.");
        Objects.requireNonNull(request, "Request is required.");

        ResourceEntity resource = resourceService.requireActiveResource(
            Objects.requireNonNull(request.resourceId(), "Resource id is required.")
        );

        Instant startTime = Objects.requireNonNull(request.startTime(), "Start time is required.");
        Instant endTime = Objects.requireNonNull(request.endTime(), "End time is required.");

        bookingValidator.validateTimeRange(startTime, endTime);
        bookingValidator.requireFutureStart(startTime);
        bookingValidator.ensureNoPendingOrApprovedOverlap(resource.getId(), startTime, endTime);

        BookingEntity booking = new BookingEntity();
        booking.setId(UUID.randomUUID());
        booking.setResource(resource);
        booking.setRequester(requester);
        booking.setStartTime(startTime);
        booking.setEndTime(endTime);
        booking.setPurpose(StringUtils.hasText(request.purpose()) ? request.purpose().trim() : null);
        booking.setStatus(BookingStatus.PENDING);

        BookingEntity saved = bookingRepository.save(booking);
        return toResponse(saved);
    }


    @Transactional(readOnly = true)
    public List<BookingDtos.BookingResponse> listBookingsForUser(UserEntity requester) {
        Objects.requireNonNull(requester, "Requester is required.");
        return bookingRepository.findAllByRequesterIdOrderByStartTimeDesc(requester.getId()).stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public BookingDtos.BookingResponse getBookingForUser(UserEntity requester, UUID bookingId) {
        Objects.requireNonNull(requester, "Requester is required.");
        BookingEntity booking = requireBooking(bookingId);
        if (!booking.getRequester().getId().equals(requester.getId())) {
            throw new ForbiddenException("You cannot view this booking.");
        }
        return toResponse(booking);
    }

    @Transactional(readOnly = true)
    public List<BookingDtos.BookingResponse> listAllBookings() {
        return bookingRepository.findAllByOrderByStartTimeDesc().stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public BookingDtos.BookingResponse getBooking(UUID bookingId) {
        return toResponse(requireBooking(bookingId));
    }


    @Transactional
    public BookingDtos.BookingResponse cancelBooking(
        UserEntity requester,
        UUID bookingId,
        BookingDtos.CancelBookingRequest request
    ) {
        Objects.requireNonNull(requester, "Requester is required.");
        BookingEntity booking = requireBooking(bookingId);

        if (!booking.getRequester().getId().equals(requester.getId())) {
            throw new ForbiddenException("You cannot cancel this booking.");
        }

        if (booking.getStatus() == BookingStatus.REJECTED || booking.getStatus() == BookingStatus.CANCELLED) {
            throw new BadRequestException("This booking cannot be cancelled.");
        }

        if (booking.getStatus() == BookingStatus.APPROVED && !booking.getStartTime().isAfter(bookingValidator.currentInstant())) {
            throw new BadRequestException("Approved bookings that have started or passed cannot be cancelled.");
        }

        booking.setStatus(BookingStatus.CANCELLED);
        booking.setCancellationReason(request == null ? null : normalizeReason(request.reason()));
        booking.setCancelledAt(bookingValidator.currentInstant());

        BookingEntity saved = bookingRepository.save(booking);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    BookingEntity requireBooking(UUID bookingId) {
        Objects.requireNonNull(bookingId, "Booking id is required.");
        return bookingRepository.findById(bookingId)
            .orElseThrow(() -> new NotFoundException("Booking not found."));
    }

    BookingDtos.BookingResponse toResponse(BookingEntity booking) {
        Objects.requireNonNull(booking, "Booking is required.");
        return new BookingDtos.BookingResponse(
            booking.getId(),
            resourceService.toSummary(booking.getResource()),
            booking.getRequester() != null ? booking.getRequester().getId() : null,
            booking.getStatus(),
            booking.getStartTime(),
            booking.getEndTime(),
            booking.getPurpose(),
            booking.getRejectionReason(),
            booking.getCancellationReason(),
            booking.getDecidedAt(),
            booking.getCancelledAt()
        );
    }

    private String normalizeReason(String reason) {
        return StringUtils.hasText(reason) ? reason.trim() : null;
    }
}
