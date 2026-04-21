package com.university.smartcampus.resource;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ResourceImageRepository extends JpaRepository<ResourceImage, UUID> {

    List<ResourceImage> findByResourceIdOrderByDisplayOrderAsc(UUID resourceId);
}
