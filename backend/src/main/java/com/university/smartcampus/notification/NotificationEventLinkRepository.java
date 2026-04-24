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

    /*
     * notification_event_links has a DB-level check constraint
     * (chk_notification_event_links_one_target) requiring at least one of the
     * nine target FK columns to remain non-null. When clearing a single
     * reference, we must therefore:
     *   1. DELETE rows where the cleared column is the row's ONLY target, and
     *   2. UPDATE-null the reference only when at least one other target
     *      column still populates the row.
     * The two-step approach keeps historical audit rows alive whenever they
     * are still meaningful (e.g. a link that also pointed at a ticket or
     * building).
     */

    @Modifying
    @Query("""
        delete from NotificationEventLinkEntity l
        where l.resourceId = :resourceId
          and l.ticketId is null
          and l.ticketCommentId is null
          and l.bookingId is null
          and l.bookingModificationId is null
          and l.locationId is null
          and l.buildingId is null
          and l.resourceTypeId is null
          and l.userId is null
        """)
    int deleteOrphanResourceReferences(@Param("resourceId") UUID resourceId);

    @Modifying
    @Query("update NotificationEventLinkEntity l set l.resourceId = null where l.resourceId = :resourceId")
    int clearResourceReferences(@Param("resourceId") UUID resourceId);

    @Modifying
    @Query("""
        delete from NotificationEventLinkEntity l
        where l.bookingId in :bookingIds
          and l.ticketId is null
          and l.ticketCommentId is null
          and l.bookingModificationId is null
          and l.resourceId is null
          and l.locationId is null
          and l.buildingId is null
          and l.resourceTypeId is null
          and l.userId is null
        """)
    int deleteOrphanBookingReferences(@Param("bookingIds") Collection<UUID> bookingIds);

    @Modifying
    @Query("update NotificationEventLinkEntity l set l.bookingId = null where l.bookingId in :bookingIds")
    int clearBookingReferences(@Param("bookingIds") Collection<UUID> bookingIds);

    @Modifying
    @Query("""
        delete from NotificationEventLinkEntity l
        where l.bookingModificationId in :modificationIds
          and l.ticketId is null
          and l.ticketCommentId is null
          and l.bookingId is null
          and l.resourceId is null
          and l.locationId is null
          and l.buildingId is null
          and l.resourceTypeId is null
          and l.userId is null
        """)
    int deleteOrphanBookingModificationReferences(@Param("modificationIds") Collection<UUID> modificationIds);

    @Modifying
    @Query("update NotificationEventLinkEntity l set l.bookingModificationId = null where l.bookingModificationId in :modificationIds")
    int clearBookingModificationReferences(@Param("modificationIds") Collection<UUID> modificationIds);
}
