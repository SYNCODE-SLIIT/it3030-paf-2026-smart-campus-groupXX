package com.university.smartcampus.booking;

import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.university.smartcampus.AppEnums.RecurrencePattern;
import com.university.smartcampus.common.exception.BadRequestException;
import com.university.smartcampus.common.exception.NotFoundException;
import com.university.smartcampus.resource.ResourceEntity;
import com.university.smartcampus.resource.ResourceService;
import com.university.smartcampus.user.entity.UserEntity;

@Service
public class RecurringBookingService {

    private final RecurringBookingRepository recurringBookingRepository;
    private final BookingRepository bookingRepository;
    private final ResourceService resourceService;
    private final BookingValidator bookingValidator;

    public RecurringBookingService(
        RecurringBookingRepository recurringBookingRepository,
        BookingRepository bookingRepository,
        ResourceService resourceService,
        BookingValidator bookingValidator
    ) {
        this.recurringBookingRepository = recurringBookingRepository;
        this.bookingRepository = bookingRepository;
        this.resourceService = resourceService;
        this.bookingValidator = bookingValidator;
    }

    @Transactional
    public BookingDtos.RecurringBookingResponse createRecurringBooking(
        UserEntity requester,
        BookingDtos.CreateRecurringBookingRequest request
    ) {
        Objects.requireNonNull(requester, "Requester is required.");
        Objects.requireNonNull(request, "Request is required.");

        ResourceEntity resource = resourceService.requireActiveResource(request.resourceId());
        
        if (!resource.isBookable()) {
            throw new BadRequestException("This resource is not available for booking.");
        }

        if (request.recurrencePattern() == RecurrencePattern.NONE) {
            throw new BadRequestException("Recurrence pattern cannot be NONE.");
        }

        if (request.startDate() == null) {
            throw new BadRequestException("Start date is required.");
        }

        if (request.startTime() == null || request.endTime() == null) {
            throw new BadRequestException("Start and end times are required.");
        }

        if (!request.startTime().isBefore(request.endTime())) {
            throw new BadRequestException("Start time must be before end time.");
        }

        BookingWindow firstOccurrenceWindow = buildBookingWindow(
            request.startDate(),
            request.startTime(),
            request.endTime()
        );
        bookingValidator.validateDuration(resource, firstOccurrenceWindow.startTime(), firstOccurrenceWindow.endTime());

        if (request.endDate() != null && request.startDate().isAfter(request.endDate())) {
            throw new BadRequestException("Start date must be before end date.");
        }

        if (request.occurrenceCount() == null && request.endDate() == null) {
            throw new BadRequestException("Either end date or occurrence count must be specified.");
        }

        RecurringBookingEntity recurringBooking = new RecurringBookingEntity();
        recurringBooking.setId(UUID.randomUUID());
        recurringBooking.setResource(resource);
        recurringBooking.setRequester(requester);
        recurringBooking.setRecurrencePattern(request.recurrencePattern());
        recurringBooking.setStartDate(request.startDate());
        recurringBooking.setEndDate(request.endDate());
        recurringBooking.setOccurrenceCount(request.occurrenceCount());
        recurringBooking.setStartTime(request.startTime());
        recurringBooking.setEndTime(request.endTime());
        recurringBooking.setPurpose(request.purpose());
        recurringBooking.setActive(true);

        RecurringBookingEntity saved = recurringBookingRepository.save(recurringBooking);
        
        // Generate initial bookings
        generateBookingsForRecurringPattern(saved);
        
        return toRecurringResponse(saved);
    }

    @Transactional
    public void generateBookingsForRecurringPattern(RecurringBookingEntity recurringBooking) {
        List<BookingEntity> bookings = new ArrayList<>();
        ZonedDateTime current = ZonedDateTime.ofInstant(recurringBooking.getStartDate(), ZoneId.systemDefault());
        ZonedDateTime endDateTime = recurringBooking.getEndDate() != null
            ? ZonedDateTime.ofInstant(recurringBooking.getEndDate(), ZoneId.systemDefault())
            : null;

        int count = 0;
        int maxOccurrences = recurringBooking.getOccurrenceCount() != null ? recurringBooking.getOccurrenceCount() : Integer.MAX_VALUE;

        while (count < maxOccurrences) {
            if (endDateTime != null && current.isAfter(endDateTime)) {
                break;
            }

            LocalTime startTime = recurringBooking.getStartTime();
            LocalTime endTime = recurringBooking.getEndTime();

            BookingWindow bookingWindow = buildBookingWindow(current.toInstant(), startTime, endTime);
            Instant bookingStart = bookingWindow.startTime();
            Instant bookingEnd = bookingWindow.endTime();

            try {
                bookingValidator.validateDuration(recurringBooking.getResource(), bookingStart, bookingEnd);

                // Check for conflicts
                bookingValidator.ensureNoPendingOrApprovedOverlap(
                    recurringBooking.getResource().getId(),
                    bookingStart,
                    bookingEnd
                );

                BookingEntity booking = new BookingEntity();
                booking.setId(UUID.randomUUID());
                booking.setResource(recurringBooking.getResource());
                booking.setRequester(recurringBooking.getRequester());
                booking.setStartTime(bookingStart);
                booking.setEndTime(bookingEnd);
                booking.setPurpose(recurringBooking.getPurpose());
                booking.setStatus(com.university.smartcampus.AppEnums.BookingStatus.PENDING);
                booking.setRecurringBooking(recurringBooking);
                
                bookings.add(booking);
            } catch (BadRequestException e) {
                // Skip this occurrence if there's a conflict
            }

            // Move to next occurrence
            current = switch (recurringBooking.getRecurrencePattern()) {
                case DAILY -> current.plusDays(1);
                case WEEKLY -> current.plusWeeks(1);
                case BIWEEKLY -> current.plusWeeks(2);
                case MONTHLY -> current.plusMonths(1);
                default -> current.plusDays(1);
            };

            count++;
        }

        if (!bookings.isEmpty()) {
            bookingRepository.saveAll(bookings);
        }
    }

    @Transactional(readOnly = true)
    public List<BookingDtos.RecurringBookingResponse> listRecurringBookings(UserEntity requester) {
        Objects.requireNonNull(requester, "Requester is required.");
        return recurringBookingRepository.findByRequesterId(requester.getId()).stream()
            .map(this::toRecurringResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public BookingDtos.RecurringBookingResponse getRecurringBooking(UserEntity requester, UUID bookingId) {
        Objects.requireNonNull(requester, "Requester is required.");
        RecurringBookingEntity recurring = recurringBookingRepository.findByIdAndRequesterId(bookingId, requester.getId())
            .orElseThrow(() -> new NotFoundException("Recurring booking not found."));
        return toRecurringResponse(recurring);
    }

    @Transactional
    public BookingDtos.RecurringBookingResponse deactivateRecurringBooking(UserEntity requester, UUID bookingId) {
        Objects.requireNonNull(requester, "Requester is required.");
        RecurringBookingEntity recurring = recurringBookingRepository.findByIdAndRequesterId(bookingId, requester.getId())
            .orElseThrow(() -> new NotFoundException("Recurring booking not found."));
        
        recurring.setActive(false);
        RecurringBookingEntity saved = recurringBookingRepository.save(recurring);
        return toRecurringResponse(saved);
    }

    private BookingDtos.RecurringBookingResponse toRecurringResponse(RecurringBookingEntity recurring) {
        return new BookingDtos.RecurringBookingResponse(
            recurring.getId(),
            resourceService.toSummary(recurring.getResource()),
            recurring.getRequester().getId(),
            recurring.getRecurrencePattern(),
            recurring.getStartDate(),
            recurring.getEndDate(),
            recurring.getOccurrenceCount(),
            recurring.getStartTime(),
            recurring.getEndTime(),
            recurring.getPurpose(),
            recurring.isActive(),
            recurring.getCreatedAt()
        );
    }

    private BookingWindow buildBookingWindow(Instant baseDate, LocalTime startTime, LocalTime endTime) {
        ZonedDateTime base = ZonedDateTime.ofInstant(baseDate, ZoneId.systemDefault());

        Instant bookingStart = base.withHour(startTime.getHour())
            .withMinute(startTime.getMinute())
            .withSecond(0)
            .withNano(0)
            .toInstant();

        Instant bookingEnd = base.withHour(endTime.getHour())
            .withMinute(endTime.getMinute())
            .withSecond(0)
            .withNano(0)
            .toInstant();

        return new BookingWindow(bookingStart, bookingEnd);
    }

    private record BookingWindow(Instant startTime, Instant endTime) {
    }
}
