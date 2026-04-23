package com.university.smartcampus.resource;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

import com.university.smartcampus.AppEnums.ResourceCategory;
import com.university.smartcampus.AppEnums.ResourceStatus;

import jakarta.validation.Valid;
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
        UUID locationId,
        @PositiveOrZero Integer capacity,
        @PositiveOrZero Integer quantity,
        @NotNull ResourceStatus status,
        boolean bookable,
        boolean movable,
        LocalTime availableFrom,
        LocalTime availableTo,
        String managedByRole,
        List<String> featureCodes,
        @Valid List<AvailabilityWindowRequest> availabilityWindows
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
        LocalTime availableFrom,
        LocalTime availableTo,
        String managedByRole,
        List<String> featureCodes,
        @Valid List<AvailabilityWindowRequest> availabilityWindows
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
        List<ResourceAvailabilityWindowDetails> availabilityWindows,
        List<ResourceImageDetails> images
    ) {
    }

    public record AvailabilityWindowRequest(
        String dayOfWeek,
        LocalTime startTime,
        LocalTime endTime
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
        UUID buildingId,
        String locationName,
        String buildingCode,
        String buildingName,
        String wing,
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

    public record ResourceAvailabilityWindowDetails(
        UUID id,
        DayOfWeek dayOfWeek,
        LocalTime startTime,
        LocalTime endTime
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
        boolean isMovableDefault,
        boolean locationRequired,
        boolean capacityEnabled,
        boolean capacityRequired,
        boolean quantityEnabled,
        boolean availabilityEnabled,
        boolean featuresEnabled
    ) {
    }

    public record LocationOption(
        UUID id,
        UUID buildingId,
        String locationName,
        String buildingCode,
        String buildingName,
        String wing,
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
