package com.university.smartcampus.notification;

public interface NotificationEmailSender {

    void send(String to, String subject, String body);
}
