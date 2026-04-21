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
        boolean isMovableDefault
    ) {
    }

    public record UpdateResourceTypeRequest(
        String code,
        String name,
        ResourceCategory category,
        String description,
        Boolean isBookableDefault,
        Boolean isMovableDefault
    ) {
    }

    public record ResourceTypeResponse(
        UUID id,
        String code,
        String name,
        String category,
        String description,
        boolean isBookableDefault,
        boolean isMovableDefault
    ) {
    }
}
