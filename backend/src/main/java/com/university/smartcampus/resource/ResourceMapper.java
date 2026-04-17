package com.university.smartcampus.resource;

import org.springframework.stereotype.Component;

import com.university.smartcampus.resource.ResourceDtos.CreateResourceRequest;
import com.university.smartcampus.resource.ResourceDtos.ResourceResponse;
import com.university.smartcampus.resource.ResourceDtos.ResourceSummary;
import com.university.smartcampus.resource.ResourceDtos.UpdateResourceRequest;

@Component
public class ResourceMapper {

    public ResourceEntity toEntity(CreateResourceRequest request) {
        ResourceEntity resource = new ResourceEntity();
        resource.setCode(trim(request.code()));
        resource.setName(trim(request.name()));
        resource.setCategory(request.category());
        resource.setSubcategory(trimToNull(request.subcategory()));
        resource.setDescription(trimToNull(request.description()));
        resource.setLocation(trimToNull(request.location()));
        resource.setCapacity(request.capacity());
        resource.setQuantity(request.quantity());
        resource.setStatus(request.status());
        resource.setBookable(request.bookable());
        resource.setMovable(request.movable());
        resource.setAvailableFrom(request.availableFrom());
        resource.setAvailableTo(request.availableTo());
        return resource;
    }

    public void applyUpdate(ResourceEntity resource, UpdateResourceRequest request) {
        if (request.code() != null) {
            resource.setCode(trim(request.code()));
        }
        if (request.name() != null) {
            resource.setName(trim(request.name()));
        }
        if (request.category() != null) {
            resource.setCategory(request.category());
        }
        if (request.subcategory() != null) {
            resource.setSubcategory(trimToNull(request.subcategory()));
        }
        if (request.description() != null) {
            resource.setDescription(trimToNull(request.description()));
        }
        if (request.location() != null) {
            resource.setLocation(trimToNull(request.location()));
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
        if (request.availableFrom() != null) {
            resource.setAvailableFrom(request.availableFrom());
        }
        if (request.availableTo() != null) {
            resource.setAvailableTo(request.availableTo());
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
            resource.getUpdatedAt()
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
}