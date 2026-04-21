package com.university.smartcampus.resource;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ResourceFeatureRepository extends JpaRepository<ResourceFeature, UUID> {

    Optional<ResourceFeature> findByCodeIgnoreCase(String code);

    List<ResourceFeature> findAllByOrderByNameAsc();
}
