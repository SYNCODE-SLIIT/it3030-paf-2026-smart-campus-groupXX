package com.university.smartcampus.resource;

import org.springframework.stereotype.Component;

import com.university.smartcampus.resource.ResourceTypeDtos.CreateResourceTypeRequest;
import com.university.smartcampus.resource.ResourceTypeDtos.ResourceTypeResponse;
import com.university.smartcampus.resource.ResourceTypeDtos.UpdateResourceTypeRequest;

@Component
public class ResourceTypeMapper {

    public ResourceType toEntity(CreateResourceTypeRequest request) {
        ResourceType resourceType = new ResourceType();
        resourceType.setCode(trim(request.code()));
        resourceType.setName(trim(request.name()));
        resourceType.setCategory(request.category());
        resourceType.setDescription(trimToNull(request.description()));
        resourceType.setBookableDefault(request.isBookableDefault());
        resourceType.setMovableDefault(request.isMovableDefault());
        return resourceType;
    }

    public void applyUpdate(ResourceType resourceType, UpdateResourceTypeRequest request) {
        if (request.code() != null) {
            resourceType.setCode(trim(request.code()));
        }
        if (request.name() != null) {
            resourceType.setName(trim(request.name()));
        }
        if (request.category() != null) {
            resourceType.setCategory(request.category());
        }
        if (request.description() != null) {
            resourceType.setDescription(trimToNull(request.description()));
        }
        if (request.isBookableDefault() != null) {
            resourceType.setBookableDefault(request.isBookableDefault());
        }
        if (request.isMovableDefault() != null) {
            resourceType.setMovableDefault(request.isMovableDefault());
        }
    }

    public ResourceTypeResponse toResponse(ResourceType resourceType) {
        return new ResourceTypeResponse(
            resourceType.getId(),
            resourceType.getCode(),
            resourceType.getName(),
            resourceType.getCategory() == null ? null : resourceType.getCategory().name(),
            resourceType.getDescription(),
            resourceType.isBookableDefault(),
            resourceType.isMovableDefault()
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
