package com.university.smartcampus.booking;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
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
import com.university.smartcampus.notification.NotificationService;
import com.university.smartcampus.resource.ResourceEntity;
import com.university.smartcampus.resource.ResourceService;
import com.university.smartcampus.user.entity.FacultyEntity;
import com.university.smartcampus.user.entity.StudentEntity;
import com.university.smartcampus.user.entity.UserEntity;

@Service
public class BookingService {

    private static final List<BookingStatus> BLOCKING_STATUSES = List.of(
        BookingStatus.PENDING,
        BookingStatus.APPROVED,
        BookingStatus.CHECKED_IN
    );

    private final BookingRepository bookingRepository;
    private final ResourceService resourceService;
    private final BookingValidator bookingValidator;
    private final BookingResourceAvailabilityService bookingResourceAvailabilityService;
    private final NotificationService notificationService;

    public BookingService(
        BookingRepository bookingRepository,
        ResourceService resourceService,
        BookingValidator bookingValidator,
        BookingResourceAvailabilityService bookingResourceAvailabilityService,
        NotificationService notificationService
    ) {
        this.bookingRepository = bookingRepository;
        this.resourceService = resourceService;
        this.bookingValidator = bookingValidator;
        this.bookingResourceAvailabilityService = bookingResourceAvailabilityService;
        this.notificationService = notificationService;
    }

    @Transactional
    public BookingDtos.BookingResponse createBooking(UserEntity requester, BookingDtos.CreateBookingRequest request) {
        Objects.requireNonNull(requester, "Requester is required.");
        Objects.requireNonNull(request, "Request is required.");

        ResourceEntity resource = resourceService.requireActiveResource(
            Objects.requireNonNull(request.resourceId(), "Resource id is required.")
        );

        if (!resource.isBookable()) {
            throw new BadRequestException("This resource is not available for booking.");
        }

        Instant startTime = Objects.requireNonNull(request.startTime(), "Start time is required.");
        Instant endTime = Objects.requireNonNull(request.endTime(), "End time is required.");

        bookingValidator.validateTimeRange(startTime, endTime);
        bookingValidator.validateDuration(resource, startTime, endTime);
        bookingValidator.validateBookingWindow(resource, startTime, endTime);
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
        notificationService.notifyBookingCreated(saved);
        return toResponse(saved);
    }


    @Transactional
    public List<BookingDtos.BookingResponse> listBookingsForUser(UserEntity requester) {
        Objects.requireNonNull(requester, "Requester is required.");
        List<BookingEntity> bookings = bookingRepository.findAllByRequesterIdOrderByStartTimeDesc(requester.getId());
        bookingResourceAvailabilityService.reconcileFutureBookings(bookings);
        return bookings.stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional
    public BookingDtos.BookingResponse getBookingForUser(UserEntity requester, UUID bookingId) {
        Objects.requireNonNull(requester, "Requester is required.");
        BookingEntity booking = requireBooking(bookingId);
        if (!booking.getRequester().getId().equals(requester.getId())) {
            throw new ForbiddenException("You cannot view this booking.");
        }
        bookingResourceAvailabilityService.reconcileFutureBookings(List.of(booking));
        return toResponse(booking);
    }

    @Transactional
    public List<BookingDtos.BookingResponse> listAllBookings() {
        List<BookingEntity> bookings = bookingRepository.findAllByOrderByStartTimeDesc();
        bookingResourceAvailabilityService.reconcileFutureBookings(bookings);
        return bookings.stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional
    public BookingDtos.BookingResponse getBooking(UUID bookingId) {
        BookingEntity booking = requireBooking(bookingId);
        bookingResourceAvailabilityService.reconcileFutureBookings(List.of(booking));
        return toResponse(booking);
    }

    @Transactional(readOnly = true)
    public BookingDtos.ResourceRemainingRangesResponse getRemainingRangesForResource(UUID resourceId, LocalDate date) {
        Objects.requireNonNull(resourceId, "Resource id is required.");
        Objects.requireNonNull(date, "Date is required.");

        ResourceEntity resource = resourceService.requireActiveResource(resourceId);
        if (!resource.isBookable()) {
            throw new BadRequestException("This resource is not available for booking.");
        }

        ZoneId zoneId = bookingValidator.bookingZoneId();
        Instant dayStart = date.atStartOfDay(zoneId).toInstant();
        Instant dayEnd = date.plusDays(1).atStartOfDay(zoneId).toInstant();
        Instant bookingWindowStart = bookingValidator.getBookingWindowStart(resource, date, zoneId);
        Instant bookingWindowEnd = bookingValidator.getBookingWindowEnd(resource, date, zoneId);

        Instant now = bookingValidator.currentInstant();
        Instant windowStart = bookingWindowStart.isBefore(now) ? now : bookingWindowStart;
        Instant windowEnd = bookingWindowEnd.isBefore(dayEnd) ? bookingWindowEnd : dayEnd;

        if (!windowStart.isBefore(windowEnd)) {
            return new BookingDtos.ResourceRemainingRangesResponse(
                resourceId,
                date,
                windowStart,
                windowEnd,
                List.of()
            );
        }

        List<BookingEntity> blockedBookings = bookingRepository
            .findAllByResourceIdAndStatusInAndStartTimeLessThanAndEndTimeGreaterThanOrderByStartTimeAsc(
                resourceId,
                BLOCKING_STATUSES,
                windowEnd,
                windowStart
            );

        List<BookingDtos.TimeRange> remainingRanges = new ArrayList<>();
        Instant cursor = windowStart;

        for (BookingEntity booking : blockedBookings) {
            Instant blockedStart = booking.getStartTime().isAfter(windowStart) ? booking.getStartTime() : windowStart;
            Instant blockedEnd = booking.getEndTime().isBefore(windowEnd) ? booking.getEndTime() : windowEnd;

            if (!blockedStart.isBefore(blockedEnd)) {
                continue;
            }

            if (cursor.isBefore(blockedStart)) {
                remainingRanges.add(new BookingDtos.TimeRange(cursor, blockedStart));
            }

            if (cursor.isBefore(blockedEnd)) {
                cursor = blockedEnd;
            }
        }

        if (cursor.isBefore(windowEnd)) {
            remainingRanges.add(new BookingDtos.TimeRange(cursor, windowEnd));
        }

        return new BookingDtos.ResourceRemainingRangesResponse(
            resourceId,
            date,
            windowStart,
            windowEnd,
            remainingRanges
        );
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
        notificationService.notifyBookingCancelledByRequester(saved, requester);
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
            resolveRequesterRegistrationNumber(booking.getRequester()),
            booking.getStatus(),
            booking.getStartTime(),
            booking.getEndTime(),
            booking.getPurpose(),
            booking.getRejectionReason(),
            booking.getCancellationReason(),
            booking.getDecidedAt(),
            booking.getCancelledAt(),
            booking.getCheckInStatus(),
            booking.getCheckedInAt()
        );
    }

    private String normalizeReason(String reason) {
        return StringUtils.hasText(reason) ? reason.trim() : null;
    }

    private String resolveRequesterRegistrationNumber(UserEntity requester) {
        if (requester == null) {
            return null;
        }

        StudentEntity student = requester.getStudentProfile();
        if (student != null && StringUtils.hasText(student.getRegistrationNumber())) {
            return student.getRegistrationNumber().trim();
        }

        FacultyEntity faculty = requester.getFacultyProfile();
        if (faculty != null && StringUtils.hasText(faculty.getEmployeeNumber())) {
            return faculty.getEmployeeNumber().trim();
        }

        return requester.getId() != null ? requester.getId().toString() : null;
    }
}
