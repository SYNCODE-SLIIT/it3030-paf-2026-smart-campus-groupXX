package com.university.smartcampus.notification;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

import com.university.smartcampus.notification.NotificationEnums.NotificationDomain;

public class NotificationPreferenceId implements Serializable {

    private UUID userId;
    private NotificationDomain domain;

    public NotificationPreferenceId() {
    }

    public NotificationPreferenceId(UUID userId, NotificationDomain domain) {
        this.userId = userId;
        this.domain = domain;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public NotificationDomain getDomain() {
        return domain;
    }

    public void setDomain(NotificationDomain domain) {
        this.domain = domain;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        if (!(other instanceof NotificationPreferenceId that)) {
            return false;
        }
        return Objects.equals(userId, that.userId) && domain == that.domain;
    }

    @Override
    public int hashCode() {
        return Objects.hash(userId, domain);
    }
}
