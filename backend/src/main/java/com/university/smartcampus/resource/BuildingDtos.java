package com.university.smartcampus.resource;

import java.time.Instant;
import java.util.UUID;

import com.university.smartcampus.AppEnums.BuildingType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public final class BuildingDtos {

    private BuildingDtos() {
    }

    public record CreateBuildingRequest(
        @NotBlank String buildingName,
        @NotBlank String buildingCode,
        @NotNull BuildingType buildingType,
        boolean hasWings,
        String leftWingPrefix,
        String rightWingPrefix,
        String defaultPrefix,
        String description,
        Boolean isActive
    ) {
    }

    public record UpdateBuildingRequest(
        String buildingName,
        String buildingCode,
        BuildingType buildingType,
        Boolean hasWings,
        String leftWingPrefix,
        String rightWingPrefix,
        String defaultPrefix,
        String description,
        Boolean isActive
    ) {
    }

    public record BuildingResponse(
        UUID id,
        String buildingName,
        String buildingCode,
        String buildingType,
        boolean hasWings,
        String leftWingPrefix,
        String rightWingPrefix,
        String defaultPrefix,
        String description,
        boolean isActive,
        Instant createdAt,
        Instant updatedAt
    ) {
    }
}
