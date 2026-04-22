package com.university.smartcampus.user.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.university.smartcampus.common.enums.AppEnums.AdminAction;
import com.university.smartcampus.user.entity.AuditLogEntity;

public interface AuditLogRepository extends JpaRepository<AuditLogEntity, UUID>, JpaSpecificationExecutor<AuditLogEntity> {

    List<AuditLogEntity> findAllByOrderByCreatedAtDesc();

    List<AuditLogEntity> findByTargetUserIdOrderByCreatedAtDesc(UUID targetUserId);

    List<AuditLogEntity> findByPerformedByIdOrderByCreatedAtDesc(UUID performedById);

    List<AuditLogEntity> findByActionOrderByCreatedAtDesc(AdminAction action);

    Page<AuditLogEntity> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<AuditLogEntity> findByTargetUserIdOrderByCreatedAtDesc(UUID targetUserId, Pageable pageable);
}
