package com.university.smartcampus.notification;

public final class NotificationEnums {

    private NotificationEnums() {
    }

    public enum NotificationDomain {
        TICKET,
        BOOKING,
        CATALOG,
        SYSTEM
    }

    public enum NotificationSeverity {
        INFO,
        SUCCESS,
        WARNING,
        ACTION_REQUIRED,
        CRITICAL
    }

    public enum NotificationDeliveryChannel {
        IN_APP,
        EMAIL
    }

    public enum NotificationDeliveryStatus {
        PENDING,
        SENT,
        FAILED,
        SKIPPED
    }
}
