package com.university.smartcampus.notification;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

import com.university.smartcampus.config.SmartCampusProperties;

@Component
@ConditionalOnProperty(prefix = "app.notifications.email", name = "enabled", havingValue = "true")
public class SmtpNotificationEmailSender implements NotificationEmailSender {

    private final JavaMailSender mailSender;
    private final SmartCampusProperties properties;

    public SmtpNotificationEmailSender(JavaMailSender mailSender, SmartCampusProperties properties) {
        this.mailSender = mailSender;
        this.properties = properties;
    }

    @Override
    public void send(String to, String subject, String body) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(properties.getNotifications().getEmail().getFrom());
        message.setTo(to);
        message.setSubject(subject);
        message.setText(body);
        mailSender.send(message);
    }
}
