package com.university.smartcampus.resource;

import java.util.UUID;

import com.university.smartcampus.AppEnums.ResourceCategory;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public final class ResourceTypeDtos {

    private ResourceTypeDtos() {
    }

    public record CreateResourceTypeRequest(
        @NotBlank String code,
        @NotBlank String name,
        @NotNull ResourceCategory category,
        String description,
        boolean isBookableDefault,
        boolean isMovableDefault,
        boolean locationRequired,
        boolean capacityEnabled,
        boolean capacityRequired,
        boolean quantityEnabled,
        boolean availabilityEnabled,
        boolean featuresEnabled
    ) {
    }

    public record UpdateResourceTypeRequest(
        String code,
        String name,
        ResourceCategory category,
        String description,
        Boolean isBookableDefault,
        Boolean isMovableDefault,
        Boolean locationRequired,
        Boolean capacityEnabled,
        Boolean capacityRequired,
        Boolean quantityEnabled,
        Boolean availabilityEnabled,
        Boolean featuresEnabled
    ) {
    }

    public record ResourceTypeResponse(
        UUID id,
        String code,
        String name,
        String category,
        String description,
        boolean isBookableDefault,
        boolean isMovableDefault,
        boolean locationRequired,
        boolean capacityEnabled,
        boolean capacityRequired,
        boolean quantityEnabled,
        boolean availabilityEnabled,
        boolean featuresEnabled
    ) {
    }
}
