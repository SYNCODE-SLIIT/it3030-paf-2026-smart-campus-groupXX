package com.university.smartcampus.resource;

import java.time.Instant;
import java.time.LocalTime;
import java.util.UUID;

import com.university.smartcampus.AppEnums.ResourceCategory;
import com.university.smartcampus.AppEnums.ResourceStatus;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

public final class ResourceDtos {

    private ResourceDtos() {
    }

    public record ResourceSummary(
        UUID id,
        String code,
        String name
    ) {
    }

    public record CreateResourceRequest(
        @NotBlank String code,
        @NotBlank String name,
        @NotNull ResourceCategory category,
        String subcategory,
        String description,
        String location,
        @PositiveOrZero Integer capacity,
        @PositiveOrZero Integer quantity,
        @NotNull ResourceStatus status,
        boolean bookable,
        boolean movable,
        LocalTime availableFrom,
        LocalTime availableTo
    ) {
    }

    public record UpdateResourceRequest(
        String code,
        String name,
        ResourceCategory category,
        String subcategory,
        String description,
        String location,
        @PositiveOrZero Integer capacity,
        @PositiveOrZero Integer quantity,
        ResourceStatus status,
        Boolean bookable,
        Boolean movable,
        LocalTime availableFrom,
        LocalTime availableTo
    ) {
    }

    public record ResourceResponse(
        UUID id,
        String code,
        String name,
        ResourceCategory category,
        String subcategory,
        String description,
        String location,
        Integer capacity,
        Integer quantity,
        ResourceStatus status,
        boolean bookable,
        boolean movable,
        LocalTime availableFrom,
        LocalTime availableTo,
        Instant createdAt,
        Instant updatedAt
    ) {
    }
}