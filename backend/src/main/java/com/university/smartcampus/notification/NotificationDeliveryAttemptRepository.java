package com.university.smartcampus.notification;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.university.smartcampus.notification.NotificationEnums.NotificationDeliveryChannel;
import com.university.smartcampus.notification.NotificationEnums.NotificationDeliveryStatus;

public interface NotificationDeliveryAttemptRepository extends JpaRepository<NotificationDeliveryAttemptEntity, UUID> {

    Optional<NotificationDeliveryAttemptEntity> findFirstByRecipientIdAndChannel(UUID recipientId, NotificationDeliveryChannel channel);

    @EntityGraph(attributePaths = {
        "recipient",
        "recipient.event",
        "recipient.recipientUser"
    })
    List<NotificationDeliveryAttemptEntity> findByChannelAndStatusInAndNextAttemptAtLessThanEqualOrderByCreatedAtAsc(
        NotificationDeliveryChannel channel,
        Collection<NotificationDeliveryStatus> statuses,
        Instant nextAttemptAt,
        Pageable pageable
    );

    @EntityGraph(attributePaths = {
        "recipient",
        "recipient.event",
        "recipient.recipientUser"
    })
    @Query("""
            select attempt
            from NotificationDeliveryAttemptEntity attempt
            join attempt.recipient recipient
            join recipient.event event
            where attempt.channel = :channel
              and (:status is null or attempt.status = :status)
            order by attempt.createdAt desc
            """)
    List<NotificationDeliveryAttemptEntity> findForAdmin(
        @Param("channel") NotificationDeliveryChannel channel,
        @Param("status") NotificationDeliveryStatus status,
        Pageable pageable
    );
}
