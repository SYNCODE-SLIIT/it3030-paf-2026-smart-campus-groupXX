package com.university.smartcampus.resource;

import java.time.LocalTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.university.smartcampus.AppEnums.ResourceCategory;
import com.university.smartcampus.AppEnums.ResourceStatus;
import com.university.smartcampus.common.dto.ApiDtos.MessageResponse;
import com.university.smartcampus.common.exception.BadRequestException;
import com.university.smartcampus.common.exception.ConflictException;
import com.university.smartcampus.common.exception.NotFoundException;
import com.university.smartcampus.resource.ResourceDtos.CreateResourceRequest;
import com.university.smartcampus.resource.ResourceDtos.ResourceResponse;
import com.university.smartcampus.resource.ResourceDtos.ResourceSummary;
import com.university.smartcampus.resource.ResourceDtos.UpdateResourceRequest;

@Service
public class ResourceService {

    private final ResourceRepository resourceRepository;
    private final ResourceMapper resourceMapper;

    public ResourceService(ResourceRepository resourceRepository, ResourceMapper resourceMapper) {
        this.resourceRepository = resourceRepository;
        this.resourceMapper = resourceMapper;
    }

    @Transactional
    public ResourceResponse createResource(CreateResourceRequest request) {
        String normalizedCode = normalizeRequiredCode(request.code());
        String normalizedName = normalizeRequiredName(request.name());
        ensureCodeAvailable(normalizedCode, null);
        validateAvailability(request.availableFrom(), request.availableTo());

        ResourceEntity resource = resourceMapper.toEntity(request);
        resource.setId(UUID.randomUUID());
        resource.setCode(normalizedCode);
        resource.setName(normalizedName);
        return resourceMapper.toResourceResponse(resourceRepository.save(resource));
    }

    @Transactional(readOnly = true)
    public List<ResourceResponse> getResources(String search, ResourceCategory category, ResourceStatus status, String location) {
        Specification<ResourceEntity> specification = (root, query, cb) -> cb.conjunction();

        if (StringUtils.hasText(search)) {
            String normalizedSearch = likeValue(search);
            specification = specification.and((root, query, cb) -> cb.or(
                cb.like(cb.lower(root.get("code")), normalizedSearch),
                cb.like(cb.lower(root.get("name")), normalizedSearch),
                cb.like(cb.lower(root.get("description")), normalizedSearch),
                cb.like(cb.lower(root.get("subcategory")), normalizedSearch)
            ));
        }

        if (category != null) {
            specification = specification.and((root, query, cb) -> cb.equal(root.get("category"), category));
        }

        if (status != null) {
            specification = specification.and((root, query, cb) -> cb.equal(root.get("status"), status));
        }

        if (StringUtils.hasText(location)) {
            String normalizedLocation = likeValue(location);
            specification = specification.and((root, query, cb) -> cb.like(cb.lower(root.get("location")), normalizedLocation));
        }

        return resourceRepository.findAll(specification, Sort.by(Sort.Direction.ASC, "code")).stream()
            .map(resourceMapper::toResourceResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public ResourceResponse getResourceById(UUID id) {
        return resourceMapper.toResourceResponse(getResourceEntity(id));
    }

    @Transactional
    public ResourceResponse updateResource(UUID id, UpdateResourceRequest request) {
        ResourceEntity resource = getResourceEntity(id);
        String normalizedCode = null;
        String normalizedName = null;

        if (request.code() != null) {
            normalizedCode = normalizeRequiredCode(request.code());
            ensureCodeAvailable(normalizedCode, resource.getId());
        }

        if (request.name() != null) {
            normalizedName = normalizeRequiredName(request.name());
        }

        LocalTime nextAvailableFrom = request.availableFrom() != null ? request.availableFrom() : resource.getAvailableFrom();
        LocalTime nextAvailableTo = request.availableTo() != null ? request.availableTo() : resource.getAvailableTo();
        validateAvailability(nextAvailableFrom, nextAvailableTo);

        resourceMapper.applyUpdate(resource, request);
        if (normalizedCode != null) {
            resource.setCode(normalizedCode);
        }
        if (normalizedName != null) {
            resource.setName(normalizedName);
        }

        return resourceMapper.toResourceResponse(resource);
    }

    @Transactional
    public MessageResponse deleteResource(UUID id) {
        ResourceEntity resource = getResourceEntity(id);
        resource.setStatus(ResourceStatus.INACTIVE);
        return new MessageResponse("Resource removed.");
    }

    @Transactional(readOnly = true)
    public ResourceEntity requireActiveResource(UUID id) {
        ResourceEntity resource = getResourceEntity(id);
        if (resource.getStatus() != ResourceStatus.ACTIVE) {
            throw new BadRequestException("Resource is not active.");
        }
        return resource;
    }

    @Transactional(readOnly = true)
    public ResourceSummary toSummary(ResourceEntity resource) {
        return resourceMapper.toSummary(resource);
    }

    private ResourceEntity getResourceEntity(UUID id) {
        return resourceRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Resource not found."));
    }

    private void ensureCodeAvailable(String code, UUID currentResourceId) {
        boolean exists = currentResourceId == null
            ? resourceRepository.existsByCodeIgnoreCase(code)
            : resourceRepository.existsByCodeIgnoreCaseAndIdNot(code, currentResourceId);
        if (exists) {
            throw new ConflictException("A resource with this code already exists.");
        }
    }

    private void validateAvailability(LocalTime availableFrom, LocalTime availableTo) {
        if (availableFrom != null && availableTo != null && !availableFrom.isBefore(availableTo)) {
            throw new BadRequestException("Available from must be earlier than available to.");
        }
    }

    private String normalizeRequiredCode(String code) {
        if (!StringUtils.hasText(code)) {
            throw new BadRequestException("Code is required.");
        }
        return code.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizeRequiredName(String name) {
        if (!StringUtils.hasText(name)) {
            throw new BadRequestException("Name is required.");
        }
        return name.trim();
    }

    private String likeValue(String value) {
        return "%" + value.trim().toLowerCase(Locale.ROOT) + "%";
    }
}