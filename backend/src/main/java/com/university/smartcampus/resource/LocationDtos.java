package com.university.smartcampus.resource;

import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public final class LocationDtos {

    private LocationDtos() {
    }

    public record CreateLocationRequest(
        @NotNull UUID buildingId,
        String wing,
        String floor,
        String roomCode,
        @NotBlank String locationName,
        @NotBlank String locationType,
        String description
    ) {
    }

    public record UpdateLocationRequest(
        UUID buildingId,
        String wing,
        String floor,
        String roomCode,
        String locationName,
        String locationType,
        String description
    ) {
    }

    public record LocationResponse(
        UUID id,
        UUID buildingId,
        String buildingName,
        String buildingCode,
        boolean buildingHasWings,
        String wing,
        String floor,
        String roomCode,
        String locationName,
        String locationType,
        String description
    ) {
    }
}
