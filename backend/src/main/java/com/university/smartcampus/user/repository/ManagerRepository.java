package com.university.smartcampus.user.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.university.smartcampus.user.entity.ManagerEntity;

public interface ManagerRepository extends JpaRepository<ManagerEntity, UUID> {

    Optional<ManagerEntity> findByUserId(UUID userId);
}
