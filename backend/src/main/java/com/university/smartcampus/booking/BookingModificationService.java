package com.university.smartcampus.booking;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.university.smartcampus.AppEnums.ModificationStatus;
import com.university.smartcampus.common.exception.BadRequestException;
import com.university.smartcampus.common.exception.ForbiddenException;
import com.university.smartcampus.common.exception.NotFoundException;
import com.university.smartcampus.notification.NotificationService;
import com.university.smartcampus.user.entity.UserEntity;

@Service
public class BookingModificationService {

    private final BookingModificationRepository modificationRepository;
    private final BookingRepository bookingRepository;
    private final BookingValidator bookingValidator;
    private final NotificationService notificationService;
    private final BookingResourceAvailabilityService bookingResourceAvailabilityService;

    public BookingModificationService(
        BookingModificationRepository modificationRepository,
        BookingRepository bookingRepository,
        BookingValidator bookingValidator,
        NotificationService notificationService,
        BookingResourceAvailabilityService bookingResourceAvailabilityService
    ) {
        this.modificationRepository = modificationRepository;
        this.bookingRepository = bookingRepository;
        this.bookingValidator = bookingValidator;
        this.notificationService = notificationService;
        this.bookingResourceAvailabilityService = bookingResourceAvailabilityService;
    }

    @Transactional
    public BookingDtos.BookingModificationResponse requestModification(
        UserEntity requester,
        UUID bookingId,
        BookingDtos.RequestModificationRequest request
    ) {
        Objects.requireNonNull(requester, "Requester is required.");
        Objects.requireNonNull(bookingId, "Booking ID is required.");
        Objects.requireNonNull(request, "Request is required.");

        BookingEntity booking = bookingRepository.findById(bookingId)
            .orElseThrow(() -> new NotFoundException("Booking not found."));

        if (!booking.getRequester().getId().equals(requester.getId())) {
            throw new ForbiddenException("You can only modify your own bookings.");
        }

        if (booking.getStatus() != com.university.smartcampus.AppEnums.BookingStatus.PENDING &&
            booking.getStatus() != com.university.smartcampus.AppEnums.BookingStatus.APPROVED) {
            throw new BadRequestException("Only pending or approved bookings can be modified.");
        }

        bookingResourceAvailabilityService.ensureResourceAvailableForProgression(booking);

        if (request.requestedStartTime() == null || request.requestedEndTime() == null) {
            throw new BadRequestException("New start and end times are required.");
        }

        bookingValidator.validateTimeRange(request.requestedStartTime(), request.requestedEndTime());
        bookingValidator.validateDuration(booking.getResource(), request.requestedStartTime(), request.requestedEndTime());
        bookingValidator.requireFutureStart(request.requestedStartTime());

        BookingModificationEntity modification = new BookingModificationEntity();
        modification.setId(UUID.randomUUID());
        modification.setBooking(booking);
        modification.setRequestedBy(requester);
        modification.setRequestedStartTime(request.requestedStartTime());
        modification.setRequestedEndTime(request.requestedEndTime());
        modification.setReason(request.reason());
        modification.setStatus(ModificationStatus.PENDING);

        BookingModificationEntity saved = modificationRepository.save(modification);
        notificationService.notifyModificationRequested(saved);
        return toModificationResponse(saved);
    }

    @Transactional
    public BookingDtos.BookingModificationResponse approveModification(
        UserEntity approver,
        UUID modificationId,
        BookingDtos.ModificationDecisionRequest request
    ) {
        Objects.requireNonNull(approver, "Approver is required.");
        Objects.requireNonNull(modificationId, "Modification ID is required.");

        BookingModificationEntity modification = modificationRepository.findById(modificationId)
            .orElseThrow(() -> new NotFoundException("Modification request not found."));

        if (modification.getStatus() != ModificationStatus.PENDING) {
            throw new BadRequestException("Only pending modifications can be approved.");
        }

        BookingEntity booking = modification.getBooking();
        bookingResourceAvailabilityService.ensureResourceAvailableForProgression(booking);

        // Check for conflicts with new time
        bookingValidator.validateDuration(booking.getResource(), modification.getRequestedStartTime(), modification.getRequestedEndTime());
        bookingValidator.ensureNoPendingOrApprovedOverlap(
            booking.getResource().getId(),
            modification.getRequestedStartTime(),
            modification.getRequestedEndTime(),
            booking.getId() // Exclude current booking
        );

        booking.setStartTime(modification.getRequestedStartTime());
        booking.setEndTime(modification.getRequestedEndTime());
        bookingRepository.save(booking);

        modification.setStatus(ModificationStatus.APPROVED);
        modification.setDecidedBy(approver);
        modification.setDecidedAt(bookingValidator.currentInstant());
        modification.setDecisionReason(request != null ? request.decisionReason() : null);

        BookingModificationEntity saved = modificationRepository.save(modification);
        notificationService.notifyModificationApproved(saved);
        return toModificationResponse(saved);
    }

    @Transactional
    public BookingDtos.BookingModificationResponse rejectModification(
        UserEntity rejecter,
        UUID modificationId,
        BookingDtos.ModificationDecisionRequest request
    ) {
        Objects.requireNonNull(rejecter, "Rejecter is required.");
        Objects.requireNonNull(modificationId, "Modification ID is required.");

        BookingModificationEntity modification = modificationRepository.findById(modificationId)
            .orElseThrow(() -> new NotFoundException("Modification request not found."));

        if (modification.getStatus() != ModificationStatus.PENDING) {
            throw new BadRequestException("Only pending modifications can be rejected.");
        }

        modification.setStatus(ModificationStatus.REJECTED);
        modification.setDecidedBy(rejecter);
        modification.setDecidedAt(bookingValidator.currentInstant());
        modification.setDecisionReason(request != null ? request.decisionReason() : null);

        BookingModificationEntity saved = modificationRepository.save(modification);
        notificationService.notifyModificationRejected(saved);
        return toModificationResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<BookingDtos.BookingModificationResponse> listPendingModifications() {
        return modificationRepository.findByStatusOrderByCreatedAtDesc(ModificationStatus.PENDING).stream()
            .map(this::toModificationResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<BookingDtos.BookingModificationResponse> listModificationsForBooking(UUID bookingId) {
        Objects.requireNonNull(bookingId, "Booking ID is required.");
        return modificationRepository.findByBookingId(bookingId).stream()
            .map(this::toModificationResponse)
            .toList();
    }

    private BookingDtos.BookingModificationResponse toModificationResponse(BookingModificationEntity modification) {
        return new BookingDtos.BookingModificationResponse(
            modification.getId(),
            modification.getBooking().getId(),
            modification.getRequestedStartTime(),
            modification.getRequestedEndTime(),
            modification.getReason(),
            modification.getStatus(),
            modification.getDecidedAt(),
            modification.getDecisionReason()
        );
    }
}
