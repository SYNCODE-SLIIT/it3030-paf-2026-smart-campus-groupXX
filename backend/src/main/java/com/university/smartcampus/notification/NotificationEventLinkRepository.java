package com.university.smartcampus.notification;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationEventLinkRepository extends JpaRepository<NotificationEventLinkEntity, UUID> {

    List<NotificationEventLinkEntity> findByEventId(UUID eventId);

    List<NotificationEventLinkEntity> findByEventIdIn(Collection<UUID> eventIds);

    @Modifying
    @Query("update NotificationEventLinkEntity l set l.resourceId = null where l.resourceId = :resourceId")
    int clearResourceReferences(@Param("resourceId") UUID resourceId);

    @Modifying
    @Query("update NotificationEventLinkEntity l set l.bookingId = null where l.bookingId in :bookingIds")
    int clearBookingReferences(@Param("bookingIds") Collection<UUID> bookingIds);

    @Modifying
    @Query("update NotificationEventLinkEntity l set l.bookingModificationId = null where l.bookingModificationId in :modificationIds")
    int clearBookingModificationReferences(@Param("modificationIds") Collection<UUID> modificationIds);
}
