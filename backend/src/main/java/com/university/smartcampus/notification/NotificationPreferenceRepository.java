package com.university.smartcampus.notification;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationPreferenceRepository extends JpaRepository<NotificationPreferenceEntity, NotificationPreferenceId> {

    List<NotificationPreferenceEntity> findByUserId(UUID userId);

    Optional<NotificationPreferenceEntity> findByUserIdAndDomain(UUID userId, NotificationEnums.NotificationDomain domain);
}
