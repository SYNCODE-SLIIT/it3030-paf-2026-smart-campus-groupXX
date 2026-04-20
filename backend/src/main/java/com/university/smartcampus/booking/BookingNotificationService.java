package com.university.smartcampus.booking;

import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.university.smartcampus.AppEnums.NotificationType;
import com.university.smartcampus.common.exception.NotFoundException;
import com.university.smartcampus.user.entity.UserEntity;

@Service
public class BookingNotificationService {

    private final BookingNotificationRepository notificationRepository;

    public BookingNotificationService(BookingNotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @Transactional
    public void notifyBookingApproved(BookingEntity booking) {
        Objects.requireNonNull(booking, "Booking is required.");
        createNotification(booking.getRequester(), booking, NotificationType.BOOKING_APPROVED);
    }

    @Transactional
    public void notifyBookingRejected(BookingEntity booking) {
        Objects.requireNonNull(booking, "Booking is required.");
        createNotification(booking.getRequester(), booking, NotificationType.BOOKING_REJECTED);
    }

    @Transactional
    public void notifyBookingCancelled(BookingEntity booking) {
        Objects.requireNonNull(booking, "Booking is required.");
        createNotification(booking.getRequester(), booking, NotificationType.BOOKING_CANCELLED);
    }

    @Transactional
    public void notifyBookingReminder24h(BookingEntity booking) {
        Objects.requireNonNull(booking, "Booking is required.");
        if (booking.getStatus() == com.university.smartcampus.AppEnums.BookingStatus.APPROVED) {
            createNotification(booking.getRequester(), booking, NotificationType.BOOKING_REMINDER_24H);
        }
    }

    @Transactional
    public void notifyBookingReminder1h(BookingEntity booking) {
        Objects.requireNonNull(booking, "Booking is required.");
        if (booking.getStatus() == com.university.smartcampus.AppEnums.BookingStatus.APPROVED) {
            createNotification(booking.getRequester(), booking, NotificationType.BOOKING_REMINDER_1H);
        }
    }

    @Transactional
    public void notifyModificationApproved(BookingEntity booking) {
        Objects.requireNonNull(booking, "Booking is required.");
        createNotification(booking.getRequester(), booking, NotificationType.MODIFICATION_APPROVED);
    }

    @Transactional
    public void notifyModificationRejected(BookingEntity booking) {
        Objects.requireNonNull(booking, "Booking is required.");
        createNotification(booking.getRequester(), booking, NotificationType.MODIFICATION_REJECTED);
    }

    @Transactional
    public void markNotificationAsRead(UUID notificationId) {
        BookingNotificationEntity notification = notificationRepository.findById(notificationId)
            .orElseThrow(() -> new NotFoundException("Notification not found."));
        notification.setReadAt(Instant.now());
        notificationRepository.save(notification);
    }

    @Transactional(readOnly = true)
    public List<BookingDtos.BookingNotificationResponse> listNotificationsForUser(UserEntity user) {
        Objects.requireNonNull(user, "User is required.");
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
            .map(this::toNotificationResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<BookingDtos.BookingNotificationResponse> listUnreadNotifications(UserEntity user) {
        Objects.requireNonNull(user, "User is required.");
        return notificationRepository.findByUserIdAndReadAtIsNull(user.getId()).stream()
            .map(this::toNotificationResponse)
            .toList();
    }

    private void createNotification(UserEntity user, BookingEntity booking, NotificationType type) {
        BookingNotificationEntity notification = new BookingNotificationEntity();
        notification.setId(UUID.randomUUID());
        notification.setUser(user);
        notification.setBooking(booking);
        notification.setNotificationType(type);
        notification.setSentAt(Instant.now());
        // TODO: Send email/SMS based on user preferences
        notificationRepository.save(notification);
    }

    private BookingDtos.BookingNotificationResponse toNotificationResponse(BookingNotificationEntity notification) {
        return new BookingDtos.BookingNotificationResponse(
            notification.getId(),
            notification.getBooking().getId(),
            notification.getNotificationType(),
            notification.getSentAt(),
            notification.getReadAt(),
            notification.isEmailSent(),
            notification.isSmsSent()
        );
    }
}
