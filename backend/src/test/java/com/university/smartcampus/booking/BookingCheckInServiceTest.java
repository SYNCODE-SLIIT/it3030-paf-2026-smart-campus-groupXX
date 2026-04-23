package com.university.smartcampus.booking;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.university.smartcampus.AppEnums.BookingStatus;
import com.university.smartcampus.AppEnums.CheckInStatus;
import com.university.smartcampus.AppEnums.ResourceCategory;
import com.university.smartcampus.notification.NotificationService;
import com.university.smartcampus.resource.ResourceEntity;

class BookingCheckInServiceTest {

    private final BookingRepository bookingRepository = mock(BookingRepository.class);
    private final BookingValidator bookingValidator = mock(BookingValidator.class);
    private final BookingResourceAvailabilityService bookingResourceAvailabilityService = mock(BookingResourceAvailabilityService.class);
    private final NotificationService notificationService = mock(NotificationService.class);

    private final BookingCheckInService bookingCheckInService = new BookingCheckInService(
        bookingRepository,
        bookingValidator,
        bookingResourceAvailabilityService,
        notificationService
    );

    @Test
    void reconcileEndedSpaceBookingsMarksApprovedEndedSpaceBookingAsNoShow() {
        Instant now = Instant.parse("2026-04-23T12:00:00Z");
        BookingEntity approvedEndedSpaceBooking = booking(ResourceCategory.SPACES, BookingStatus.APPROVED, now.minusSeconds(60));

        when(bookingValidator.currentInstant()).thenReturn(now);
        when(bookingRepository.findAllByStatusAndEndTimeLessThanEqualOrderByEndTimeAsc(BookingStatus.APPROVED, now))
            .thenReturn(List.of(approvedEndedSpaceBooking));
        when(bookingRepository.findAllByStatusAndEndTimeLessThanEqualOrderByEndTimeAsc(BookingStatus.CHECKED_IN, now))
            .thenReturn(List.of());
        when(bookingRepository.save(any(BookingEntity.class))).thenAnswer((invocation) -> invocation.getArgument(0));

        bookingCheckInService.reconcileEndedSpaceBookings();

        verify(bookingRepository).save(approvedEndedSpaceBooking);
        verify(notificationService).notifyBookingNoShow(approvedEndedSpaceBooking);
        verify(notificationService, never()).notifyBookingCompleted(any(BookingEntity.class));
        org.assertj.core.api.Assertions.assertThat(approvedEndedSpaceBooking.getStatus()).isEqualTo(BookingStatus.NO_SHOW);
        org.assertj.core.api.Assertions.assertThat(approvedEndedSpaceBooking.getCheckInStatus()).isEqualTo(CheckInStatus.NO_SHOW);
    }

    @Test
    void reconcileEndedSpaceBookingsMarksCheckedInEndedSpaceBookingAsCompleted() {
        Instant now = Instant.parse("2026-04-23T12:00:00Z");
        BookingEntity checkedInEndedSpaceBooking = booking(ResourceCategory.SPACES, BookingStatus.CHECKED_IN, now.minusSeconds(60));
        checkedInEndedSpaceBooking.setCheckInStatus(CheckInStatus.CHECKED_IN);

        when(bookingValidator.currentInstant()).thenReturn(now);
        when(bookingRepository.findAllByStatusAndEndTimeLessThanEqualOrderByEndTimeAsc(BookingStatus.APPROVED, now))
            .thenReturn(List.of());
        when(bookingRepository.findAllByStatusAndEndTimeLessThanEqualOrderByEndTimeAsc(BookingStatus.CHECKED_IN, now))
            .thenReturn(List.of(checkedInEndedSpaceBooking));
        when(bookingRepository.save(any(BookingEntity.class))).thenAnswer((invocation) -> invocation.getArgument(0));

        bookingCheckInService.reconcileEndedSpaceBookings();

        verify(bookingRepository).save(checkedInEndedSpaceBooking);
        verify(notificationService).notifyBookingCompleted(checkedInEndedSpaceBooking);
        verify(notificationService, never()).notifyBookingNoShow(any(BookingEntity.class));
        org.assertj.core.api.Assertions.assertThat(checkedInEndedSpaceBooking.getStatus()).isEqualTo(BookingStatus.COMPLETED);
        org.assertj.core.api.Assertions.assertThat(checkedInEndedSpaceBooking.getCheckInStatus()).isEqualTo(CheckInStatus.CHECKED_IN);
    }

    @Test
    void reconcileEndedSpaceBookingsIgnoresNonSpaceAndFutureBookings() {
        Instant now = Instant.parse("2026-04-23T12:00:00Z");
        BookingEntity approvedEndedNonSpaceBooking = booking(
            ResourceCategory.TECHNICAL_EQUIPMENT,
            BookingStatus.APPROVED,
            now.minusSeconds(60)
        );
        BookingEntity approvedFutureSpaceBooking = booking(
            ResourceCategory.SPACES,
            BookingStatus.APPROVED,
            now.plusSeconds(60)
        );
        BookingEntity checkedInFutureSpaceBooking = booking(
            ResourceCategory.SPACES,
            BookingStatus.CHECKED_IN,
            now.plusSeconds(60)
        );
        checkedInFutureSpaceBooking.setCheckInStatus(CheckInStatus.CHECKED_IN);

        when(bookingValidator.currentInstant()).thenReturn(now);
        when(bookingRepository.findAllByStatusAndEndTimeLessThanEqualOrderByEndTimeAsc(BookingStatus.APPROVED, now))
            .thenReturn(List.of(approvedEndedNonSpaceBooking, approvedFutureSpaceBooking));
        when(bookingRepository.findAllByStatusAndEndTimeLessThanEqualOrderByEndTimeAsc(BookingStatus.CHECKED_IN, now))
            .thenReturn(List.of(checkedInFutureSpaceBooking));

        bookingCheckInService.reconcileEndedSpaceBookings();

        verify(bookingRepository, never()).save(any(BookingEntity.class));
        verify(notificationService, never()).notifyBookingNoShow(any(BookingEntity.class));
        verify(notificationService, never()).notifyBookingCompleted(any(BookingEntity.class));
        org.assertj.core.api.Assertions.assertThat(approvedEndedNonSpaceBooking.getStatus()).isEqualTo(BookingStatus.APPROVED);
        org.assertj.core.api.Assertions.assertThat(approvedFutureSpaceBooking.getStatus()).isEqualTo(BookingStatus.APPROVED);
        org.assertj.core.api.Assertions.assertThat(checkedInFutureSpaceBooking.getStatus()).isEqualTo(BookingStatus.CHECKED_IN);
    }

    @Test
    void reconcileEndedSpaceBookingsDoesNotNotifyTwiceForAlreadyClosedBookings() {
        Instant now = Instant.parse("2026-04-23T12:00:00Z");
        BookingEntity noShowBooking = booking(ResourceCategory.SPACES, BookingStatus.NO_SHOW, now.minusSeconds(60));
        noShowBooking.setCheckInStatus(CheckInStatus.NO_SHOW);

        when(bookingValidator.currentInstant()).thenReturn(now);
        when(bookingRepository.findAllByStatusAndEndTimeLessThanEqualOrderByEndTimeAsc(BookingStatus.APPROVED, now))
            .thenReturn(List.of(noShowBooking));
        when(bookingRepository.findAllByStatusAndEndTimeLessThanEqualOrderByEndTimeAsc(BookingStatus.CHECKED_IN, now))
            .thenReturn(List.of());

        bookingCheckInService.reconcileEndedSpaceBookings();

        verify(bookingRepository, never()).save(any(BookingEntity.class));
        verify(notificationService, never()).notifyBookingNoShow(any(BookingEntity.class));
        verify(notificationService, never()).notifyBookingCompleted(any(BookingEntity.class));
    }

    private static BookingEntity booking(ResourceCategory category, BookingStatus status, Instant endTime) {
        BookingEntity booking = new BookingEntity();
        booking.setId(UUID.randomUUID());
        booking.setStatus(status);
        booking.setEndTime(endTime);

        ResourceEntity resource = new ResourceEntity();
        resource.setId(UUID.randomUUID());
        resource.setCategory(category);
        booking.setResource(resource);

        return booking;
    }
}
