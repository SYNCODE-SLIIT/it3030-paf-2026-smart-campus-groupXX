package com.university.smartcampus.user.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.university.smartcampus.user.entity.AdminEntity;

public interface AdminRepository extends JpaRepository<AdminEntity, UUID> {
}
