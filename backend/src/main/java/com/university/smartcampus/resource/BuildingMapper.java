package com.university.smartcampus.resource;

import org.springframework.stereotype.Component;

import com.university.smartcampus.resource.BuildingDtos.BuildingResponse;
import com.university.smartcampus.resource.BuildingDtos.CreateBuildingRequest;
import com.university.smartcampus.resource.BuildingDtos.UpdateBuildingRequest;

@Component
public class BuildingMapper {

    public Building toEntity(CreateBuildingRequest request) {
        Building building = new Building();
        building.setBuildingName(trim(request.buildingName()));
        building.setBuildingCode(trim(request.buildingCode()));
        building.setBuildingType(request.buildingType());
        building.setHasWings(request.hasWings());
        building.setLeftWingPrefix(trimToNull(request.leftWingPrefix()));
        building.setRightWingPrefix(trimToNull(request.rightWingPrefix()));
        building.setDefaultPrefix(trimToNull(request.defaultPrefix()));
        building.setDescription(trimToNull(request.description()));
        building.setActive(request.isActive() == null || request.isActive());
        return building;
    }

    public void applyUpdate(Building building, UpdateBuildingRequest request) {
        if (request.buildingName() != null) {
            building.setBuildingName(trim(request.buildingName()));
        }
        if (request.buildingCode() != null) {
            building.setBuildingCode(trim(request.buildingCode()));
        }
        if (request.buildingType() != null) {
            building.setBuildingType(request.buildingType());
        }
        if (request.hasWings() != null) {
            building.setHasWings(request.hasWings());
        }
        if (request.leftWingPrefix() != null) {
            building.setLeftWingPrefix(trimToNull(request.leftWingPrefix()));
        }
        if (request.rightWingPrefix() != null) {
            building.setRightWingPrefix(trimToNull(request.rightWingPrefix()));
        }
        if (request.defaultPrefix() != null) {
            building.setDefaultPrefix(trimToNull(request.defaultPrefix()));
        }
        if (request.description() != null) {
            building.setDescription(trimToNull(request.description()));
        }
        if (request.isActive() != null) {
            building.setActive(request.isActive());
        }
    }

    public BuildingResponse toResponse(Building building) {
        return new BuildingResponse(
            building.getId(),
            building.getBuildingName(),
            building.getBuildingCode(),
            building.getBuildingType() == null ? null : building.getBuildingType().name(),
            building.isHasWings(),
            building.getLeftWingPrefix(),
            building.getRightWingPrefix(),
            building.getDefaultPrefix(),
            building.getDescription(),
            building.isActive(),
            building.getCreatedAt(),
            building.getUpdatedAt()
        );
    }

    private String trim(String value) {
        return value == null ? null : value.trim();
    }

    private String trimToNull(String value) {
        String trimmed = trim(value);
        return trimmed == null || trimmed.isEmpty() ? null : trimmed;
    }
}
