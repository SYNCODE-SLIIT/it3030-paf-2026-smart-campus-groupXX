package com.university.smartcampus.booking;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import org.junit.jupiter.api.Test;

class BookingLifecycleSchedulerTest {

    @Test
    void reconcileEndedSpaceBookingsDelegatesToBookingCheckInService() {
        BookingCheckInService bookingCheckInService = mock(BookingCheckInService.class);
        BookingLifecycleScheduler bookingLifecycleScheduler = new BookingLifecycleScheduler(bookingCheckInService);

        bookingLifecycleScheduler.reconcileEndedSpaceBookings();

        verify(bookingCheckInService).reconcileEndedSpaceBookings();
    }
}
