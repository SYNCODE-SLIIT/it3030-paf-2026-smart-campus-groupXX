package com.university.smartcampus.notification;

import java.util.List;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.university.smartcampus.auth.service.CurrentUserService;
import com.university.smartcampus.notification.NotificationDtos.NotificationDeliveryResponse;
import com.university.smartcampus.notification.NotificationEnums.NotificationDeliveryStatus;
import com.university.smartcampus.user.entity.UserEntity;

@RestController
@RequestMapping("/api/admin/notifications")
public class AdminNotificationController {

    private final CurrentUserService currentUserService;
    private final NotificationService notificationService;

    public AdminNotificationController(CurrentUserService currentUserService, NotificationService notificationService) {
        this.currentUserService = currentUserService;
        this.notificationService = notificationService;
    }

    @GetMapping("/deliveries")
    public List<NotificationDeliveryResponse> listEmailDeliveries(
        @RequestParam(required = false) NotificationDeliveryStatus status,
        @RequestParam(required = false) Integer limit,
        Authentication authentication
    ) {
        UserEntity user = currentUserService.requireAdmin(authentication);
        return notificationService.listEmailDeliveries(user, status, limit);
    }
}
