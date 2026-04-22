package com.university.smartcampus.user.mapper;

import org.springframework.stereotype.Component;

import com.university.smartcampus.user.dto.AuditDtos.AuditLogResponse;
import com.university.smartcampus.user.entity.AuditLogEntity;

@Component
public class AuditLogMapper {

    public AuditLogResponse toResponse(AuditLogEntity entity) {
        return new AuditLogResponse(
            entity.getId(),
            entity.getAction(),
            entity.getPerformedById(),
            entity.getPerformedByEmail(),
            entity.getTargetUserId(),
            entity.getTargetUserEmail(),
            entity.getDetails(),
            entity.getCreatedAt()
        );
    }
}
