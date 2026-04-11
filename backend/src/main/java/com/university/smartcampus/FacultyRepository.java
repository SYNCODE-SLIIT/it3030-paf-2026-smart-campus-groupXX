package com.university.smartcampus;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface FacultyRepository extends JpaRepository<FacultyEntity, UUID> {
}
