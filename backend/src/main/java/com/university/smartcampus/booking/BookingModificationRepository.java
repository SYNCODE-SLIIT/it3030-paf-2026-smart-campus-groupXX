package com.university.smartcampus.booking;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.university.smartcampus.AppEnums.ModificationStatus;

@Repository
public interface BookingModificationRepository extends JpaRepository<BookingModificationEntity, UUID> {
    List<BookingModificationEntity> findByBookingId(UUID bookingId);
    List<BookingModificationEntity> findByStatus(ModificationStatus status);
    List<BookingModificationEntity> findByStatusOrderByCreatedAtDesc(ModificationStatus status);
    Optional<BookingModificationEntity> findTopByBookingIdOrderByCreatedAtDesc(UUID bookingId);

    @Query("select m.id from BookingModificationEntity m where m.booking.id in :bookingIds")
    List<UUID> findIdsByBookingIdIn(@Param("bookingIds") Collection<UUID> bookingIds);

    @Modifying
    @Query("delete from BookingModificationEntity m where m.booking.id in :bookingIds")
    int deleteByBookingIdIn(@Param("bookingIds") Collection<UUID> bookingIds);
}
