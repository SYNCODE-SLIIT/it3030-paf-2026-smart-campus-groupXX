package com.university.smartcampus.booking;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.university.smartcampus.AppEnums.BookingStatus;
import com.university.smartcampus.AppEnums.ModificationStatus;
import com.university.smartcampus.AppEnums.ResourceCategory;
import com.university.smartcampus.common.exception.BadRequestException;
import com.university.smartcampus.resource.ResourceEntity;
import com.university.smartcampus.user.entity.UserEntity;

class BookingAnalyticsServiceTest {

    private final BookingRepository bookingRepository = mock(BookingRepository.class);
    private final BookingModificationRepository bookingModificationRepository = mock(BookingModificationRepository.class);
    private final BookingValidator bookingValidator = mock(BookingValidator.class);

    private final BookingAnalyticsService bookingAnalyticsService = new BookingAnalyticsService(
        bookingRepository,
        bookingModificationRepository,
        bookingValidator
    );

    @Test
    void computesScopedBookingAnalyticsIncludingRatesTrendsAndHeatmap() {
        Instant now = Instant.parse("2026-04-24T00:00:00Z");
        ZoneId zoneId = ZoneId.of("Asia/Colombo");
        ResourceEntity lectureHall = resource(ResourceCategory.SPACES, "Lecture Hall A");
        ResourceEntity sportsGround = resource(ResourceCategory.SPORTS, "Sports Ground");

        BookingEntity pending = booking(lectureHall, BookingStatus.PENDING,
            "2026-04-20T04:00:00Z", "2026-04-20T05:00:00Z", "2026-04-18T08:00:00Z");
        BookingEntity approved = booking(lectureHall, BookingStatus.APPROVED,
            "2026-04-20T05:30:00Z", "2026-04-20T06:30:00Z", "2026-04-19T08:00:00Z");
        BookingEntity checkedIn = booking(lectureHall, BookingStatus.CHECKED_IN,
            "2026-04-20T07:30:00Z", "2026-04-20T08:30:00Z", "2026-04-19T09:00:00Z");
        BookingEntity completed = booking(lectureHall, BookingStatus.COMPLETED,
            "2026-04-20T09:30:00Z", "2026-04-20T10:30:00Z", "2026-04-19T10:00:00Z");
        BookingEntity rejected = booking(lectureHall, BookingStatus.REJECTED,
            "2026-04-20T11:00:00Z", "2026-04-20T11:30:00Z", "2026-04-19T11:00:00Z");
        BookingEntity cancelled = booking(lectureHall, BookingStatus.CANCELLED,
            "2026-04-20T12:00:00Z", "2026-04-20T12:30:00Z", "2026-04-19T12:00:00Z");
        BookingEntity noShow = booking(lectureHall, BookingStatus.NO_SHOW,
            "2026-04-20T04:45:00Z", "2026-04-20T05:45:00Z", "2026-04-19T13:00:00Z");
        BookingEntity otherResource = booking(sportsGround, BookingStatus.PENDING,
            "2026-04-20T04:00:00Z", "2026-04-20T05:00:00Z", "2026-04-19T14:00:00Z");

        BookingModificationEntity pendingModification = pendingModification(pending);
        BookingModificationEntity otherModification = pendingModification(otherResource);

        when(bookingValidator.currentInstant()).thenReturn(now);
        when(bookingValidator.bookingZoneId()).thenReturn(zoneId);
        when(bookingRepository.findAllByOrderByStartTimeDesc()).thenReturn(List.of(
            pending, approved, checkedIn, completed, rejected, cancelled, noShow, otherResource
        ));
        when(bookingModificationRepository.findByStatusOrderByCreatedAtDesc(ModificationStatus.PENDING))
            .thenReturn(List.of(pendingModification, otherModification));

        BookingDtos.BookingAnalyticsResponse response = bookingAnalyticsService.getAnalytics(
            Instant.parse("2026-04-19T18:30:00Z"),
            Instant.parse("2026-04-20T18:29:59Z"),
            BookingDtos.BookingAnalyticsBucket.DAY,
            null,
            lectureHall.getId()
        );

        assertThat(response.liveQueue().pendingApprovals()).isEqualTo(1);
        assertThat(response.liveQueue().stalePendingApprovals()).isEqualTo(1);
        assertThat(response.liveQueue().pendingModifications()).isEqualTo(1);
        assertThat(response.windowSummary().totalScheduled()).isEqualTo(7);
        assertThat(response.windowSummary().approved()).isEqualTo(1);
        assertThat(response.windowSummary().attended()).isEqualTo(2);
        assertThat(response.windowSummary().noShow()).isEqualTo(1);
        assertThat(response.windowSummary().rejected()).isEqualTo(1);
        assertThat(response.windowSummary().cancelled()).isEqualTo(1);
        assertThat(response.windowSummary().approvalRate()).isEqualTo(50.0);
        assertThat(response.windowSummary().attendanceRate()).isEqualTo(66.67);
        assertThat(response.windowSummary().noShowRate()).isEqualTo(33.33);
        assertThat(response.categoryBreakdown()).hasSize(1);
        assertThat(response.topResources()).hasSize(1);
        assertThat(response.topResources().get(0).bookingCount()).isEqualTo(7);
        assertThat(response.topResources().get(0).noShowCount()).isEqualTo(1);
        assertThat(response.trends()).hasSize(1);
        assertThat(response.trends().get(0).scheduled()).isEqualTo(7);
        assertThat(response.trends().get(0).attended()).isEqualTo(2);
        assertThat(response.trends().get(0).noShow()).isEqualTo(1);
        BookingDtos.BookingAnalyticsHeatmapCell peakCell = response.utilizationHeatmap().stream()
            .filter((cell) -> cell.dayOfWeek().equals("MONDAY") && cell.hourOfDay() == 10)
            .findFirst()
            .orElseThrow();
        assertThat(peakCell.bookingCount()).isEqualTo(2);
        assertThat(peakCell.hoursBooked()).isEqualTo(1.25);
    }

    @Test
    void rejectsInvalidDateRange() {
        when(bookingValidator.currentInstant()).thenReturn(Instant.parse("2026-04-24T00:00:00Z"));

        assertThatThrownBy(() -> bookingAnalyticsService.getAnalytics(
            Instant.parse("2026-04-24T12:00:00Z"),
            Instant.parse("2026-04-23T12:00:00Z"),
            BookingDtos.BookingAnalyticsBucket.DAY,
            null,
            null
        ))
            .isInstanceOf(BadRequestException.class)
            .hasMessage("Analytics start date must be before the end date.");
    }

    private static BookingEntity booking(
        ResourceEntity resource,
        BookingStatus status,
        String startTime,
        String endTime,
        String createdAt
    ) {
        BookingEntity booking = new BookingEntity();
        booking.setId(UUID.randomUUID());
        booking.setStatus(status);
        booking.setStartTime(Instant.parse(startTime));
        booking.setEndTime(Instant.parse(endTime));
        booking.setCreatedAt(Instant.parse(createdAt));
        booking.setResource(resource);

        UserEntity requester = new UserEntity();
        requester.setId(UUID.randomUUID());
        requester.setEmail("student@campus.test");
        booking.setRequester(requester);

        return booking;
    }

    private static ResourceEntity resource(ResourceCategory category, String name) {
        ResourceEntity resource = new ResourceEntity();
        resource.setId(UUID.randomUUID());
        resource.setCode("RS-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        resource.setName(name);
        resource.setCategory(category);
        return resource;
    }

    private static BookingModificationEntity pendingModification(BookingEntity booking) {
        BookingModificationEntity modification = new BookingModificationEntity();
        modification.setId(UUID.randomUUID());
        modification.setBooking(booking);
        modification.setRequestedBy(booking.getRequester());
        modification.setRequestedStartTime(booking.getStartTime().plusSeconds(1800));
        modification.setRequestedEndTime(booking.getEndTime().plusSeconds(1800));
        modification.setStatus(ModificationStatus.PENDING);
        return modification;
    }
}
