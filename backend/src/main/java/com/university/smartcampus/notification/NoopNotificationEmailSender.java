package com.university.smartcampus.notification;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(prefix = "app.notifications.email", name = "enabled", havingValue = "false", matchIfMissing = true)
public class NoopNotificationEmailSender implements NotificationEmailSender {

    @Override
    public void send(String to, String subject, String body) {
        // Delivery attempts are marked skipped while email is disabled.
    }
}
