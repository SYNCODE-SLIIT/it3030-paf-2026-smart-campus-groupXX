package com.university.smartcampus.resource;

import java.util.Comparator;
import java.util.List;

import org.springframework.stereotype.Component;

import com.university.smartcampus.resource.ResourceDtos.CreateResourceRequest;
import com.university.smartcampus.resource.ResourceDtos.LocationDetails;
import com.university.smartcampus.resource.ResourceDtos.ResourceFeatureDetails;
import com.university.smartcampus.resource.ResourceDtos.ResourceImageDetails;
import com.university.smartcampus.resource.ResourceDtos.ResourceResponse;
import com.university.smartcampus.resource.ResourceDtos.ResourceSummary;
import com.university.smartcampus.resource.ResourceDtos.ResourceTypeDetails;
import com.university.smartcampus.resource.ResourceDtos.UpdateResourceRequest;

@Component
public class ResourceMapper {

    public ResourceEntity toEntity(CreateResourceRequest request) {
        ResourceEntity resource = new ResourceEntity();
        resource.setCode(trim(request.code()));
        resource.setName(trim(request.name()));
        resource.setDescription(trimToNull(request.description()));
        resource.setCapacity(request.capacity());
        resource.setQuantity(request.quantity());
        resource.setStatus(request.status());
        resource.setBookable(request.bookable());
        resource.setMovable(request.movable());
        resource.setManagedByRole(trimToNull(request.managedByRole()));
        return resource;
    }

    public void applyUpdate(ResourceEntity resource, UpdateResourceRequest request) {
        if (request.name() != null) {
            resource.setName(trim(request.name()));
        }
        if (request.description() != null) {
            resource.setDescription(trimToNull(request.description()));
        }
        if (request.capacity() != null) {
            resource.setCapacity(request.capacity());
        }
        if (request.quantity() != null) {
            resource.setQuantity(request.quantity());
        }
        if (request.status() != null) {
            resource.setStatus(request.status());
        }
        if (request.bookable() != null) {
            resource.setBookable(request.bookable());
        }
        if (request.movable() != null) {
            resource.setMovable(request.movable());
        }
        if (request.managedByRole() != null) {
            resource.setManagedByRole(trimToNull(request.managedByRole()));
        }
    }

    public ResourceResponse toResourceResponse(ResourceEntity resource) {
        return new ResourceResponse(
            resource.getId(),
            resource.getCode(),
            resource.getName(),
            resource.getCategory(),
            resource.getSubcategory(),
            resource.getDescription(),
            resource.getLocation(),
            resource.getCapacity(),
            resource.getQuantity(),
            resource.getStatus(),
            resource.isBookable(),
            resource.isMovable(),
            resource.getAvailableFrom(),
            resource.getAvailableTo(),
            resource.getCreatedAt(),
            resource.getUpdatedAt(),
            toResourceTypeDetails(resource.getResourceType()),
            toLocationDetails(resource.getLocationEntity()),
            toFeatureDetails(resource),
            toImageDetails(resource)
        );
    }

    public ResourceSummary toSummary(ResourceEntity resource) {
        return new ResourceSummary(resource.getId(), resource.getCode(), resource.getName());
    }

    private String trim(String value) {
        return value == null ? null : value.trim();
    }

    private String trimToNull(String value) {
        String trimmed = trim(value);
        return trimmed == null || trimmed.isEmpty() ? null : trimmed;
    }

    private ResourceTypeDetails toResourceTypeDetails(ResourceType resourceType) {
        if (resourceType == null) {
            return null;
        }

        return new ResourceTypeDetails(
            resourceType.getId(),
            resourceType.getCode(),
            resourceType.getName(),
            resourceType.getCategory() == null ? null : resourceType.getCategory().name()
        );
    }

    private LocationDetails toLocationDetails(Location location) {
        if (location == null) {
            return null;
        }

        return new LocationDetails(
            location.getId(),
            location.getLocationName(),
            location.getBuildingName(),
            location.getFloor(),
            location.getRoomCode(),
            location.getLocationType()
        );
    }

    private List<ResourceFeatureDetails> toFeatureDetails(ResourceEntity resource) {
        if (resource.getFeatures() == null || resource.getFeatures().isEmpty()) {
            return List.of();
        }

        return resource.getFeatures().stream()
            .sorted(Comparator.comparing(ResourceFeature::getName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
            .map(feature -> new ResourceFeatureDetails(feature.getCode(), feature.getName()))
            .toList();
    }

    private List<ResourceImageDetails> toImageDetails(ResourceEntity resource) {
        if (resource.getImages() == null || resource.getImages().isEmpty()) {
            return List.of();
        }

        return resource.getImages().stream()
            .sorted(Comparator.comparingInt(image -> image.getDisplayOrder() == null ? 0 : image.getDisplayOrder()))
            .map(image -> new ResourceImageDetails(
                image.getImageUrl(),
                image.isPrimary(),
                image.getDisplayOrder() == null ? 0 : image.getDisplayOrder()
            ))
            .toList();
    }
}
