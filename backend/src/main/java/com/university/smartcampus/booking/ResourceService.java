package com.university.smartcampus.booking;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.university.smartcampus.AppEnums.ResourceStatus;
import com.university.smartcampus.BadRequestException;
import com.university.smartcampus.NotFoundException;

@Service
public class ResourceService {

    private final ResourceRepository resourceRepository;
    private final BookingValidator bookingValidator;

    public ResourceService(ResourceRepository resourceRepository, BookingValidator bookingValidator) {
        this.resourceRepository = resourceRepository;
        this.bookingValidator = bookingValidator;
    }

    public ResourceEntity requireActiveResource(UUID resourceId) {
        ResourceEntity resource = requireResource(resourceId);
        bookingValidator.requireActiveResource(resource);
        return resource;
    }

    public List<ResourceDtos.ResourceResponse> listActiveResources() {
        return resourceRepository.findByStatus(ResourceStatus.ACTIVE).stream()
            .map(this::toResponse)
            .toList();
    }

    public ResourceEntity requireResource(UUID resourceId) {
        Objects.requireNonNull(resourceId, "Resource id is required.");
        return resourceRepository.findById(resourceId)
            .orElseThrow(() -> new NotFoundException("Resource not found."));
    }

    ResourceDtos.ResourceSummary toSummary(ResourceEntity resource) {
        if (resource == null) {
            throw new BadRequestException("Resource is required.");
        }
        return new ResourceDtos.ResourceSummary(resource.getId(), resource.getCode(), resource.getName());
    }

    public ResourceDtos.ResourceResponse toResponse(ResourceEntity resource) {
        if (resource == null) {
            throw new BadRequestException("Resource is required.");
        }
        return new ResourceDtos.ResourceResponse(
            resource.getId(),
            resource.getCode(),
            resource.getName(),
            resource.getCategory(),
            resource.getSubcategory(),
            resource.getLocation(),
            resource.getCapacity(),
            resource.getStatus()
        );
    }
}
