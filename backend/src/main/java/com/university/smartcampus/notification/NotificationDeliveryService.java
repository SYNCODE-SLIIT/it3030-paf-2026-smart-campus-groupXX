package com.university.smartcampus.notification;

import java.time.Instant;
import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.university.smartcampus.config.SmartCampusProperties;
import com.university.smartcampus.notification.NotificationEnums.NotificationDeliveryChannel;
import com.university.smartcampus.notification.NotificationEnums.NotificationDeliveryStatus;

@Service
public class NotificationDeliveryService {

    private static final List<NotificationDeliveryStatus> RETRYABLE_STATUSES = List.of(
        NotificationDeliveryStatus.PENDING,
        NotificationDeliveryStatus.FAILED
    );

    private final NotificationDeliveryAttemptRepository deliveryAttemptRepository;
    private final NotificationEmailSender emailSender;
    private final SmartCampusProperties properties;

    public NotificationDeliveryService(
        NotificationDeliveryAttemptRepository deliveryAttemptRepository,
        NotificationEmailSender emailSender,
        SmartCampusProperties properties
    ) {
        this.deliveryAttemptRepository = deliveryAttemptRepository;
        this.emailSender = emailSender;
        this.properties = properties;
    }

    @Scheduled(fixedDelayString = "${app.notifications.email.retry-delay-seconds:300}000")
    @Transactional
    public void deliverPendingEmailNotifications() {
        SmartCampusProperties.Email email = properties.getNotifications().getEmail();
        if (!email.isEnabled()) {
            return;
        }

        int batchSize = Math.max(1, email.getBatchSize());
        List<NotificationDeliveryAttemptEntity> attempts = deliveryAttemptRepository
            .findByChannelAndStatusInAndNextAttemptAtLessThanEqualOrderByCreatedAtAsc(
                NotificationDeliveryChannel.EMAIL,
                RETRYABLE_STATUSES,
                Instant.now(),
                PageRequest.of(0, batchSize)
            );

        for (NotificationDeliveryAttemptEntity attempt : attempts) {
            deliverEmail(attempt, email);
        }
    }

    private void deliverEmail(NotificationDeliveryAttemptEntity attempt, SmartCampusProperties.Email email) {
        if (attempt.getAttemptCount() >= email.getRetryMaxAttempts()) {
            attempt.setStatus(NotificationDeliveryStatus.FAILED);
            attempt.setNextAttemptAt(null);
            return;
        }

        try {
            attempt.setAttemptCount(attempt.getAttemptCount() + 1);
            emailSender.send(
                attempt.getRecipient().getRecipientUser().getEmail(),
                attempt.getRecipient().getEvent().getTitle(),
                buildEmailBody(attempt)
            );
            attempt.setStatus(NotificationDeliveryStatus.SENT);
            attempt.setSentAt(Instant.now());
            attempt.setFailedAt(null);
            attempt.setFailureReason(null);
            attempt.setNextAttemptAt(null);
        } catch (RuntimeException exception) {
            attempt.setStatus(NotificationDeliveryStatus.FAILED);
            attempt.setFailedAt(Instant.now());
            attempt.setFailureReason(trimFailure(exception));
            if (attempt.getAttemptCount() < email.getRetryMaxAttempts()) {
                attempt.setNextAttemptAt(Instant.now().plusSeconds(Math.max(1, email.getRetryDelaySeconds())));
            } else {
                attempt.setNextAttemptAt(null);
            }
        }
    }

    private String buildEmailBody(NotificationDeliveryAttemptEntity attempt) {
        NotificationRecipientEntity recipient = attempt.getRecipient();
        NotificationEventEntity event = recipient.getEvent();
        StringBuilder body = new StringBuilder();
        body.append(event.getTitle()).append("\n\n");
        if (StringUtils.hasText(event.getBody())) {
            body.append(event.getBody()).append("\n\n");
        }
        if (StringUtils.hasText(recipient.getActionUrl())) {
            body.append("Open: ")
                .append(actionBaseUrl())
                .append(recipient.getActionUrl())
                .append("\n");
        }
        return body.toString();
    }

    private String actionBaseUrl() {
        String baseUrl = properties.getNotifications().getEmail().getActionBaseUrl();
        if (!StringUtils.hasText(baseUrl)) {
            return "";
        }
        return baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
    }

    private String trimFailure(RuntimeException exception) {
        String message = exception.getMessage();
        if (!StringUtils.hasText(message)) {
            return exception.getClass().getSimpleName();
        }
        return message.length() > 500 ? message.substring(0, 500) : message;
    }
}
