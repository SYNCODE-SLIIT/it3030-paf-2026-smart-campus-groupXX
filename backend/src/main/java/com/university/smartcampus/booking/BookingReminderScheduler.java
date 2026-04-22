package com.university.smartcampus.booking;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.university.smartcampus.AppEnums.BookingStatus;
import com.university.smartcampus.notification.NotificationService;

@Component
public class BookingReminderScheduler {

    private static final Duration WINDOW = Duration.ofMinutes(10);

    private final BookingRepository bookingRepository;
    private final NotificationService notificationService;

    public BookingReminderScheduler(BookingRepository bookingRepository, NotificationService notificationService) {
        this.bookingRepository = bookingRepository;
        this.notificationService = notificationService;
    }

    @Scheduled(fixedDelayString = "${app.notifications.booking-reminders.fixed-delay-ms:600000}")
    @Transactional
    public void sendApprovedBookingReminders() {
        Instant now = Instant.now();
        sendReminder("BOOKING_REMINDER_24H", now.plus(Duration.ofHours(24)), WINDOW);
        sendReminder("BOOKING_REMINDER_1H", now.plus(Duration.ofHours(1)), WINDOW);
    }

    private void sendReminder(String type, Instant targetStart, Duration window) {
        List<BookingEntity> bookings = bookingRepository.findAllByStatusAndStartTimeBetweenOrderByStartTimeAsc(
            BookingStatus.APPROVED,
            targetStart.minus(window),
            targetStart.plus(window)
        );
        for (BookingEntity booking : bookings) {
            notificationService.notifyBookingReminder(booking, type);
        }
    }
}
