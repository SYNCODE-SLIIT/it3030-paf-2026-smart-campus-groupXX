package com.university.smartcampus.user.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.university.smartcampus.user.entity.FacultyEntity;

public interface FacultyRepository extends JpaRepository<FacultyEntity, UUID> {
}
