package com.university.smartcampus.booking;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.university.smartcampus.AppEnums.ResourceCategory;
import com.university.smartcampus.AppEnums.ResourceStatus;
import com.university.smartcampus.common.exception.BadRequestException;
import com.university.smartcampus.resource.ResourceEntity;

class BookingValidatorTest {

    private static final ZoneId BOOKING_ZONE_ID = ZoneId.of("Asia/Colombo");

    private final BookingValidator bookingValidator = new BookingValidator(
        mock(BookingRepository.class),
        "Asia/Colombo"
    );

    @Test
    void validateBookingWindowAllowsSpaceBookingsWithinBusinessHours() {
        ResourceEntity resource = resource(ResourceCategory.SPACES);

        bookingValidator.validateBookingWindow(
            resource,
            instant(2026, 4, 23, 8, 30),
            instant(2026, 4, 23, 17, 30)
        );
    }

    @Test
    void validateBookingWindowRejectsSpaceBookingsOutsideBusinessHours() {
        ResourceEntity resource = resource(ResourceCategory.SPACES);

        assertThatThrownBy(() -> bookingValidator.validateBookingWindow(
            resource,
            instant(2026, 4, 23, 8, 0),
            instant(2026, 4, 23, 9, 0)
        ))
            .isInstanceOf(BadRequestException.class)
            .hasMessage("Bookings for spaces must be between 8:30 AM and 5:30 PM.");
    }

    @Test
    void validateBookingWindowIgnoresNonSpaceBookings() {
        ResourceEntity resource = resource(ResourceCategory.GENERAL_UTILITY);

        bookingValidator.validateBookingWindow(
            resource,
            instant(2026, 4, 23, 0, 0),
            instant(2026, 4, 23, 23, 59)
        );
    }

    @Test
    void validateDurationRejectsSpaceBookingsLongerThanThreeHours() {
        ResourceEntity resource = resource(ResourceCategory.SPACES);

        assertThatThrownBy(() -> bookingValidator.validateDuration(
            resource,
            instant(2026, 4, 23, 9, 0),
            instant(2026, 4, 23, 12, 30)
        ))
            .isInstanceOf(BadRequestException.class)
            .hasMessage("Maximum booking duration for this resource is 3 hours");
    }

    @Test
    void validateDurationAllowsSpaceBookingsUpToThreeHours() {
        ResourceEntity resource = resource(ResourceCategory.SPACES);

        bookingValidator.validateDuration(
            resource,
            instant(2026, 4, 23, 9, 0),
            instant(2026, 4, 23, 12, 0)
        );
    }

    @Test
    void validateDurationIgnoresNonSpaceBookingsForLongRanges() {
        ResourceEntity resource = resource(ResourceCategory.TECHNICAL_EQUIPMENT);

        bookingValidator.validateDuration(
            resource,
            instant(2026, 4, 23, 9, 0),
            instant(2026, 4, 25, 12, 0)
        );
    }

    @Test
    void getBookingWindowReturnsSpaceBusinessHours() {
        ResourceEntity resource = resource(ResourceCategory.SPACES);

        Instant start = bookingValidator.getBookingWindowStart(resource, LocalDate.of(2026, 4, 23), BOOKING_ZONE_ID);
        Instant end = bookingValidator.getBookingWindowEnd(resource, LocalDate.of(2026, 4, 23), BOOKING_ZONE_ID);

        assertThat(start).isEqualTo(LocalDate.of(2026, 4, 23).atTime(LocalTime.of(8, 30)).atZone(BOOKING_ZONE_ID).toInstant());
        assertThat(end).isEqualTo(LocalDate.of(2026, 4, 23).atTime(LocalTime.of(17, 30)).atZone(BOOKING_ZONE_ID).toInstant());
    }

    private static ResourceEntity resource(ResourceCategory category) {
        ResourceEntity resource = new ResourceEntity();
        resource.setId(UUID.randomUUID());
        resource.setCategory(category);
        resource.setStatus(ResourceStatus.ACTIVE);
        resource.setBookable(true);
        return resource;
    }

    private static Instant instant(int year, int month, int day, int hour, int minute) {
        return LocalDate.of(year, month, day).atTime(hour, minute).atZone(BOOKING_ZONE_ID).toInstant();
    }
}
