package com.university.smartcampus.booking;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.university.smartcampus.AppEnums.ModificationStatus;

@Repository
public interface BookingModificationRepository extends JpaRepository<BookingModificationEntity, UUID> {
    List<BookingModificationEntity> findByBookingId(UUID bookingId);
    List<BookingModificationEntity> findByStatus(ModificationStatus status);
    List<BookingModificationEntity> findByStatusOrderByCreatedAtDesc(ModificationStatus status);
    Optional<BookingModificationEntity> findTopByBookingIdOrderByCreatedAtDesc(UUID bookingId);
}
