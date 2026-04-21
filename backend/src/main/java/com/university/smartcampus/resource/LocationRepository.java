package com.university.smartcampus.resource;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface LocationRepository extends JpaRepository<Location, UUID> {

    Optional<Location> findByLocationNameIgnoreCase(String locationName);

    List<Location> findAllByOrderByLocationNameAsc();
}
