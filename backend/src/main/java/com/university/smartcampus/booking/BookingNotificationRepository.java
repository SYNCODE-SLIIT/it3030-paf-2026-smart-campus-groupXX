package com.university.smartcampus.booking;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.university.smartcampus.AppEnums.NotificationType;

@Repository
public interface BookingNotificationRepository extends JpaRepository<BookingNotificationEntity, UUID> {
    List<BookingNotificationEntity> findByUserId(UUID userId);
    List<BookingNotificationEntity> findByUserIdAndReadAtIsNull(UUID userId);
    List<BookingNotificationEntity> findByBookingId(UUID bookingId);
    List<BookingNotificationEntity> findByNotificationTypeAndEmailSentFalse(NotificationType notificationType);
    List<BookingNotificationEntity> findByUserIdOrderByCreatedAtDesc(UUID userId);
}
