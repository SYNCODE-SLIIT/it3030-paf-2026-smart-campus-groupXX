package com.university.smartcampus.resource;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LocationRepository extends JpaRepository<Location, UUID> {

    Optional<Location> findByLocationNameIgnoreCase(String locationName);

    @Override
    @EntityGraph(attributePaths = "building")
    List<Location> findAll();

    @Override
    @EntityGraph(attributePaths = "building")
    Optional<Location> findById(UUID id);

    @EntityGraph(attributePaths = "building")
    List<Location> findAllByOrderByLocationNameAsc();

    boolean existsByLocationNameIgnoreCaseAndBuilding_Id(String locationName, UUID buildingId);

    boolean existsByLocationNameIgnoreCaseAndBuilding_IdAndIdNot(String locationName, UUID buildingId, UUID id);

    boolean existsByRoomCodeIgnoreCaseAndBuilding_Id(String roomCode, UUID buildingId);

    boolean existsByRoomCodeIgnoreCaseAndBuilding_IdAndIdNot(String roomCode, UUID buildingId, UUID id);
}
