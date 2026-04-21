package com.university.smartcampus.resource;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ResourceTypeRepository extends JpaRepository<ResourceType, UUID> {

    Optional<ResourceType> findByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCase(String code);

    List<ResourceType> findAllByOrderByNameAsc();
}
