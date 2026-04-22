package com.university.smartcampus.notification;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.university.smartcampus.notification.NotificationEnums.NotificationDomain;

public interface NotificationRecipientRepository extends JpaRepository<NotificationRecipientEntity, UUID> {

    @EntityGraph(attributePaths = { "event", "event.actorUser", "recipientUser" })
    @Query("""
            select recipient
            from NotificationRecipientEntity recipient
            join recipient.event event
            where recipient.recipientUser.id = :userId
              and recipient.archivedAt is null
              and (:unreadOnly = false or recipient.readAt is null)
              and (:domain is null or event.domain = :domain)
            order by recipient.createdAt desc
            """)
    List<NotificationRecipientEntity> findForUser(
        @Param("userId") UUID userId,
        @Param("unreadOnly") boolean unreadOnly,
        @Param("domain") NotificationDomain domain,
        Pageable pageable
    );

    @EntityGraph(attributePaths = { "event", "event.actorUser", "recipientUser" })
    Optional<NotificationRecipientEntity> findByIdAndRecipientUserId(UUID id, UUID recipientUserId);

    long countByRecipientUserIdAndReadAtIsNullAndArchivedAtIsNull(UUID recipientUserId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update NotificationRecipientEntity recipient
            set recipient.readAt = :readAt
            where recipient.recipientUser.id = :userId
              and recipient.readAt is null
              and recipient.archivedAt is null
            """)
    int markAllUnreadAsRead(@Param("userId") UUID userId, @Param("readAt") Instant readAt);
}
