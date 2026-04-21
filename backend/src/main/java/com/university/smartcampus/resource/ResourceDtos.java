package com.university.smartcampus.resource;

import java.time.Instant;
import java.time.LocalTime;
import java.util.List;
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
        String description,
        @NotNull UUID resourceTypeId,
        @NotNull UUID locationId,
        @PositiveOrZero Integer capacity,
        @PositiveOrZero Integer quantity,
        @NotNull ResourceStatus status,
        boolean bookable,
        boolean movable,
        String managedByRole,
        List<String> featureCodes
    ) {
    }

    public record UpdateResourceRequest(
        String name,
        String description,
        UUID resourceTypeId,
        UUID locationId,
        @PositiveOrZero Integer capacity,
        @PositiveOrZero Integer quantity,
        ResourceStatus status,
        Boolean bookable,
        Boolean movable,
        String managedByRole,
        List<String> featureCodes
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
        Instant updatedAt,
        ResourceTypeDetails resourceType,
        LocationDetails locationDetails,
        List<ResourceFeatureDetails> features,
        List<ResourceImageDetails> images
    ) {
    }

    public record ResourceTypeDetails(
        UUID id,
        String code,
        String name,
        String category
    ) {
    }

    public record LocationDetails(
        UUID id,
        String locationName,
        String buildingName,
        String floor,
        String roomCode,
        String locationType
    ) {
    }

    public record ResourceFeatureDetails(
        String code,
        String name
    ) {
    }

    public record ResourceImageDetails(
        String imageUrl,
        boolean isPrimary,
        int displayOrder
    ) {
    }

    public record ResourceTypeOption(
        UUID id,
        String code,
        String name,
        String category,
        boolean isBookableDefault,
        boolean isMovableDefault
    ) {
    }

    public record LocationOption(
        UUID id,
        String locationName,
        String buildingName,
        String floor,
        String roomCode,
        String locationType
    ) {
    }

    public record ResourceFeatureOption(
        UUID id,
        String code,
        String name
    ) {
    }

    public record ManagedByRoleOption(
        String value,
        String label
    ) {
    }
}
