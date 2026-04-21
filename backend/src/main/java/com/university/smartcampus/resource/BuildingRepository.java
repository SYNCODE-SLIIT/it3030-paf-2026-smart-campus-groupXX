package com.university.smartcampus.resource;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface BuildingRepository extends JpaRepository<Building, UUID> {

    List<Building> findAllByOrderByBuildingNameAsc();

    boolean existsByBuildingNameIgnoreCase(String buildingName);

    boolean existsByBuildingNameIgnoreCaseAndIdNot(String buildingName, UUID id);

    boolean existsByBuildingCodeIgnoreCase(String buildingCode);

    boolean existsByBuildingCodeIgnoreCaseAndIdNot(String buildingCode, UUID id);
}
