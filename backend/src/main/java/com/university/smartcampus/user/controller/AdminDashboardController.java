package com.university.smartcampus.user.controller;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.university.smartcampus.auth.service.CurrentUserService;
import com.university.smartcampus.user.dto.AdminDtos.AdminDashboardResponse;
import com.university.smartcampus.user.entity.UserEntity;
import com.university.smartcampus.user.service.AdminDashboardService;

@RestController
@RequestMapping("/api/admin/dashboard")
public class AdminDashboardController {

    private final CurrentUserService currentUserService;
    private final AdminDashboardService adminDashboardService;

    public AdminDashboardController(
        CurrentUserService currentUserService,
        AdminDashboardService adminDashboardService
    ) {
        this.currentUserService = currentUserService;
        this.adminDashboardService = adminDashboardService;
    }

    @GetMapping
    public AdminDashboardResponse getDashboard(Authentication authentication) {
        UserEntity admin = currentUserService.requireAdmin(authentication);
        return adminDashboardService.getDashboard(admin);
    }
}
