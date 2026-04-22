package com.university.smartcampus.notification;

import java.util.List;
import java.util.UUID;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.university.smartcampus.auth.service.CurrentUserService;
import com.university.smartcampus.notification.NotificationDtos.NotificationPreferencesResponse;
import com.university.smartcampus.notification.NotificationDtos.NotificationResponse;
import com.university.smartcampus.notification.NotificationDtos.NotificationUnreadCountResponse;
import com.university.smartcampus.notification.NotificationDtos.UpdateNotificationPreferencesRequest;
import com.university.smartcampus.notification.NotificationEnums.NotificationDomain;
import com.university.smartcampus.user.entity.UserEntity;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final CurrentUserService currentUserService;
    private final NotificationService notificationService;

    public NotificationController(CurrentUserService currentUserService, NotificationService notificationService) {
        this.currentUserService = currentUserService;
        this.notificationService = notificationService;
    }

    @GetMapping
    public List<NotificationResponse> listNotifications(
        @RequestParam(required = false, defaultValue = "all") String status,
        @RequestParam(required = false) NotificationDomain domain,
        @RequestParam(required = false) Integer limit,
        Authentication authentication
    ) {
        UserEntity user = currentUserService.requireCurrentUserWithCompletedOnboarding(authentication);
        return notificationService.listNotifications(user, status, domain, limit);
    }

    @GetMapping("/unread-count")
    public NotificationUnreadCountResponse unreadCount(Authentication authentication) {
        UserEntity user = currentUserService.requireCurrentUserWithCompletedOnboarding(authentication);
        return notificationService.unreadCount(user);
    }

    @PostMapping("/{notificationId}/read")
    public NotificationResponse markAsRead(@PathVariable UUID notificationId, Authentication authentication) {
        UserEntity user = currentUserService.requireCurrentUserWithCompletedOnboarding(authentication);
        return notificationService.markAsRead(user, notificationId);
    }

    @PostMapping("/read-all")
    public NotificationUnreadCountResponse markAllAsRead(Authentication authentication) {
        UserEntity user = currentUserService.requireCurrentUserWithCompletedOnboarding(authentication);
        return notificationService.markAllAsRead(user);
    }

    @GetMapping("/preferences")
    public NotificationPreferencesResponse getPreferences(Authentication authentication) {
        UserEntity user = currentUserService.requireCurrentUserWithCompletedOnboarding(authentication);
        return notificationService.getPreferences(user);
    }

    @PatchMapping("/preferences")
    public NotificationPreferencesResponse updatePreferences(
        @RequestBody UpdateNotificationPreferencesRequest request,
        Authentication authentication
    ) {
        UserEntity user = currentUserService.requireCurrentUserWithCompletedOnboarding(authentication);
        return notificationService.updatePreferences(user, request);
    }
}
