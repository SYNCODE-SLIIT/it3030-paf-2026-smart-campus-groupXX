package com.university.smartcampus.user.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.university.smartcampus.auth.service.CurrentUserService;
import com.university.smartcampus.booking.BookingDtos;
import com.university.smartcampus.booking.BookingNotificationService;
import com.university.smartcampus.user.entity.UserEntity;

@RestController
@RequestMapping("/api/notifications/bookings")
public class BookingNotificationController {

    private final CurrentUserService currentUserService;
    private final BookingNotificationService notificationService;

    public BookingNotificationController(
        CurrentUserService currentUserService,
        BookingNotificationService notificationService
    ) {
        this.currentUserService = currentUserService;
        this.notificationService = notificationService;
    }

    @GetMapping
    public List<BookingDtos.BookingNotificationResponse> listNotifications(Authentication authentication) {
        UserEntity user = currentUserService.requireCurrentUser(authentication);
        return notificationService.listNotificationsForUser(user);
    }

    @GetMapping("/unread")
    public List<BookingDtos.BookingNotificationResponse> listUnreadNotifications(Authentication authentication) {
        UserEntity user = currentUserService.requireCurrentUser(authentication);
        return notificationService.listUnreadNotifications(user);
    }

    @PostMapping("/{notificationId}/read")
    public void markNotificationAsRead(@PathVariable UUID notificationId) {
        notificationService.markNotificationAsRead(notificationId);
    }
}
