package com.university.smartcampus.booking;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class BookingLifecycleScheduler {

    private final BookingCheckInService bookingCheckInService;

    public BookingLifecycleScheduler(BookingCheckInService bookingCheckInService) {
        this.bookingCheckInService = bookingCheckInService;
    }

    @Scheduled(fixedDelayString = "${app.booking.lifecycle.fixed-delay-ms:300000}")
    public void reconcileEndedSpaceBookings() {
        bookingCheckInService.reconcileEndedSpaceBookings();
    }
}
