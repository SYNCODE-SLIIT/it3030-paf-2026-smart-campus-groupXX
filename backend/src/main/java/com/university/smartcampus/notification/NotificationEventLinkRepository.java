package com.university.smartcampus.notification;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationEventLinkRepository extends JpaRepository<NotificationEventLinkEntity, UUID> {

    List<NotificationEventLinkEntity> findByEventId(UUID eventId);

    List<NotificationEventLinkEntity> findByEventIdIn(Collection<UUID> eventIds);
}
