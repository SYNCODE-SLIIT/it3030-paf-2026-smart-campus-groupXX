package com.university.smartcampus.user.controller;

import java.time.Instant;
import java.util.UUID;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.university.smartcampus.auth.service.CurrentUserService;
import com.university.smartcampus.common.enums.AppEnums.AdminAction;
import com.university.smartcampus.user.dto.AuditDtos.AuditLogPageResponse;
import com.university.smartcampus.user.service.AuditLogService;

@RestController
@RequestMapping("/api/admin/audit-logs")
public class AdminAuditLogController {

    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 100;

    private final CurrentUserService currentUserService;
    private final AuditLogService auditLogService;

    public AdminAuditLogController(CurrentUserService currentUserService, AuditLogService auditLogService) {
        this.currentUserService = currentUserService;
        this.auditLogService = auditLogService;
    }

    @GetMapping
    public AuditLogPageResponse listAuditLogs(
            @RequestParam(required = false) AdminAction action,
            @RequestParam(required = false) UUID performedById,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {
        currentUserService.requireAdmin(authentication);
        return auditLogService.getRecentLogs(action, performedById, from, to, safePage(page), safeSize(size));
    }

    @GetMapping("/user/{userId}")
    public AuditLogPageResponse listAuditLogsForUser(
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {
        currentUserService.requireAdmin(authentication);
        return auditLogService.getLogsByTargetUser(userId, safePage(page), safeSize(size));
    }

    private int safePage(int page) {
        return Math.max(page, 0);
    }

    private int safeSize(int size) {
        if (size <= 0) {
            return DEFAULT_PAGE_SIZE;
        }

        return Math.min(size, MAX_PAGE_SIZE);
    }
}
