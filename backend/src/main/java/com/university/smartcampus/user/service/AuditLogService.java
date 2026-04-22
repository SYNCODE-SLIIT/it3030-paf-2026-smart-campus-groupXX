package com.university.smartcampus.user.service;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.university.smartcampus.common.enums.AppEnums.AdminAction;
import com.university.smartcampus.user.dto.AuditDtos.AuditLogPageResponse;
import com.university.smartcampus.user.dto.AuditDtos.AuditLogResponse;
import com.university.smartcampus.user.entity.AuditLogEntity;
import com.university.smartcampus.user.mapper.AuditLogMapper;
import com.university.smartcampus.user.repository.AuditLogRepository;

import tools.jackson.databind.ObjectMapper;

@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final AuditLogMapper auditLogMapper;
    private final ObjectMapper objectMapper;

    public AuditLogService(
            AuditLogRepository auditLogRepository,
            AuditLogMapper auditLogMapper,
            ObjectMapper objectMapper) {
        this.auditLogRepository = auditLogRepository;
        this.auditLogMapper = auditLogMapper;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public void logAction(
            AdminAction action,
            UUID performedById,
            String performedByEmail,
            UUID targetUserId,
            String targetUserEmail,
            Map<String, Object> details) {
        AuditLogEntity entry = new AuditLogEntity();
        entry.setId(UUID.randomUUID());
        entry.setAction(action);
        entry.setPerformedById(performedById);
        entry.setPerformedByEmail(performedByEmail);
        entry.setTargetUserId(targetUserId);
        entry.setTargetUserEmail(targetUserEmail);
        entry.setDetails(serializeDetails(details));
        entry.setCreatedAt(Instant.now());
        auditLogRepository.save(entry);
    }

    @Transactional(readOnly = true)
    public AuditLogPageResponse getRecentLogs(
            AdminAction action,
            UUID performedById,
            Instant from,
            Instant to,
            int page,
            int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Specification<AuditLogEntity> specification = (root, query, cb) -> cb.conjunction();

        if (action != null) {
            specification = specification.and((root, query, cb) -> cb.equal(root.get("action"), action));
        }

        if (performedById != null) {
            specification = specification.and((root, query, cb) -> cb.equal(root.get("performedById"), performedById));
        }

        if (from != null) {
            specification = specification.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("createdAt"), from));
        }

        if (to != null) {
            specification = specification.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("createdAt"), to));
        }

        Page<AuditLogEntity> entries = auditLogRepository.findAll(specification, pageable);
        return toPageResponse(entries);
    }

    @Transactional(readOnly = true)
    public AuditLogPageResponse getLogsByTargetUser(UUID userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<AuditLogEntity> entries = auditLogRepository.findByTargetUserIdOrderByCreatedAtDesc(userId, pageable);
        return toPageResponse(entries);
    }

    @Transactional(readOnly = true)
    public AuditLogPageResponse getLogsByAction(AdminAction action, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Specification<AuditLogEntity> specification = (root, query, cb) -> cb.equal(root.get("action"), action);
        Page<AuditLogEntity> entries = auditLogRepository.findAll(specification, pageable);
        return toPageResponse(entries);
    }

    private AuditLogPageResponse toPageResponse(Page<AuditLogEntity> page) {
        return new AuditLogPageResponse(
            page.getContent().stream().map(auditLogMapper::toResponse).toList(),
            page.getNumber(),
            page.getSize(),
            page.getTotalElements(),
            page.getTotalPages(),
            page.hasNext()
        );
    }

    private String serializeDetails(Map<String, Object> details) {
        if (details == null || details.isEmpty()) {
            return null;
        }

        try {
            return objectMapper.writeValueAsString(details);
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to serialize audit log details.", exception);
        }
    }
}
