package com.university.smartcampus.user.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.university.smartcampus.common.enums.AppEnums.AdminAction;

public final class AuditDtos {

    private AuditDtos() {
    }

    public record AuditLogResponse(
        UUID id,
        AdminAction action,
        UUID performedById,
        String performedByEmail,
        UUID targetUserId,
        String targetUserEmail,
        String details,
        Instant createdAt
    ) {
    }

    public record AuditLogPageResponse(
        List<AuditLogResponse> items,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean hasNext
    ) {
    }
}
