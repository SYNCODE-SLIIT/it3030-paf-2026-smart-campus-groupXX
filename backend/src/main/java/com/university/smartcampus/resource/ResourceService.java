package com.university.smartcampus.resource;

import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
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
import com.university.smartcampus.resource.ResourceDtos.LocationOption;
import com.university.smartcampus.resource.ResourceDtos.ManagedByRoleOption;
import com.university.smartcampus.resource.ResourceDtos.ResourceFeatureOption;
import com.university.smartcampus.resource.ResourceDtos.ResourceResponse;
import com.university.smartcampus.resource.ResourceDtos.ResourceSummary;
import com.university.smartcampus.resource.ResourceDtos.ResourceTypeOption;
import com.university.smartcampus.resource.ResourceDtos.UpdateResourceRequest;

@Service
public class ResourceService {

    private static final Set<String> ALLOWED_MANAGED_BY_ROLES = Set.of(
        "CATALOG_MANAGER",
        "LIBRARY_MANAGER",
        "TECHNICAL_MANAGER",
        "FACILITIES_MANAGER",
        "MAINTENANCE_MANAGER",
        "SPORTS_MANAGER",
        "EVENTS_MANAGER",
        "TRANSPORT_MANAGER"
    );

    private final ResourceRepository resourceRepository;
    private final ResourceTypeRepository resourceTypeRepository;
    private final LocationRepository locationRepository;
    private final ResourceFeatureRepository resourceFeatureRepository;
    private final ResourceMapper resourceMapper;

    public ResourceService(
        ResourceRepository resourceRepository,
        ResourceTypeRepository resourceTypeRepository,
        LocationRepository locationRepository,
        ResourceFeatureRepository resourceFeatureRepository,
        ResourceMapper resourceMapper
    ) {
        this.resourceRepository = resourceRepository;
        this.resourceTypeRepository = resourceTypeRepository;
        this.locationRepository = locationRepository;
        this.resourceFeatureRepository = resourceFeatureRepository;
        this.resourceMapper = resourceMapper;
    }

    @Transactional
    public ResourceResponse createResource(CreateResourceRequest request) {
        String normalizedCode = normalizeRequiredCode(request.code());
        String normalizedName = normalizeRequiredName(request.name());
        ensureCodeAvailable(normalizedCode, null);

        ResourceEntity resource = resourceMapper.toEntity(request);
        ResourceType resourceType = requireResourceType(request.resourceTypeId());
        Location location = requireLocation(request.locationId());

        resource.setId(UUID.randomUUID());
        resource.setCode(normalizedCode);
        resource.setName(normalizedName);
        resource.setResourceType(resourceType);
        resource.setLocationEntity(location);
        resource.setManagedByRole(normalizeManagedByRole(request.managedByRole()));
        resource.setFeatures(resolveFeatures(request.featureCodes()));
        syncLegacyCompatibilityFields(resource, resourceType, location);
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

    @Transactional(readOnly = true)
    public List<ResourceTypeOption> getResourceTypeOptions() {
        return resourceTypeRepository.findAllByOrderByNameAsc().stream()
            .map(resourceType -> new ResourceTypeOption(
                resourceType.getId(),
                resourceType.getCode(),
                resourceType.getName(),
                resourceType.getCategory() == null ? null : resourceType.getCategory().name(),
                resourceType.isBookableDefault(),
                resourceType.isMovableDefault()
            ))
            .toList();
    }

    @Transactional(readOnly = true)
    public List<LocationOption> getLocationOptions() {
        return locationRepository.findAllByOrderByLocationNameAsc().stream()
            .map(location -> new LocationOption(
                location.getId(),
                location.getBuilding() == null ? null : location.getBuilding().getId(),
                location.getLocationName(),
                location.getBuilding() == null ? null : location.getBuilding().getBuildingCode(),
                location.getBuilding() == null ? location.getBuildingName() : location.getBuilding().getBuildingName(),
                location.getWing(),
                location.getFloor(),
                location.getRoomCode(),
                location.getLocationType()
            ))
            .toList();
    }

    @Transactional(readOnly = true)
    public List<ResourceFeatureOption> getResourceFeatureOptions() {
        return resourceFeatureRepository.findAllByOrderByNameAsc().stream()
            .map(feature -> new ResourceFeatureOption(
                feature.getId(),
                feature.getCode(),
                feature.getName()
            ))
            .toList();
    }

    @Transactional(readOnly = true)
    public List<ManagedByRoleOption> getManagedByRoleOptions() {
        return ALLOWED_MANAGED_BY_ROLES.stream()
            .sorted()
            .map(role -> new ManagedByRoleOption(role, toManagedByRoleLabel(role)))
            .toList();
    }

    @Transactional
    public ResourceResponse updateResource(UUID id, UpdateResourceRequest request) {
        ResourceEntity resource = getResourceEntity(id);
        String normalizedName = null;
        ResourceType nextResourceType = resource.getResourceType();
        Location nextLocation = resource.getLocationEntity();

        if (request.name() != null) {
            normalizedName = normalizeRequiredName(request.name());
        }

        if (request.resourceTypeId() != null) {
            nextResourceType = requireResourceType(request.resourceTypeId());
            resource.setResourceType(nextResourceType);
        }

        if (request.locationId() != null) {
            nextLocation = requireLocation(request.locationId());
            resource.setLocationEntity(nextLocation);
        }

        resourceMapper.applyUpdate(resource, request);
        if (normalizedName != null) {
            resource.setName(normalizedName);
        }
        if (request.managedByRole() != null) {
            resource.setManagedByRole(normalizeManagedByRole(request.managedByRole()));
        }
        if (request.featureCodes() != null) {
            resource.setFeatures(resolveFeatures(request.featureCodes()));
        }
        syncLegacyCompatibilityFields(resource, nextResourceType, nextLocation);

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

    private ResourceType requireResourceType(UUID resourceTypeId) {
        return resourceTypeRepository.findById(resourceTypeId)
            .orElseThrow(() -> new NotFoundException("Resource type not found."));
    }

    private Location requireLocation(UUID locationId) {
        return locationRepository.findById(locationId)
            .orElseThrow(() -> new NotFoundException("Location not found."));
    }

    private Set<ResourceFeature> resolveFeatures(List<String> featureCodes) {
        if (featureCodes == null || featureCodes.isEmpty()) {
            return new HashSet<>();
        }

        Set<ResourceFeature> features = new HashSet<>();
        Set<String> missingCodes = new HashSet<>();

        for (String featureCode : featureCodes) {
            String normalizedFeatureCode = normalizeFeatureCode(featureCode);
            ResourceFeature feature = resourceFeatureRepository.findByCodeIgnoreCase(normalizedFeatureCode)
                .orElse(null);

            if (feature == null) {
                missingCodes.add(normalizedFeatureCode);
                continue;
            }

            features.add(feature);
        }

        if (!missingCodes.isEmpty()) {
            throw new BadRequestException("Unknown feature codes: " + String.join(", ", missingCodes));
        }

        return features;
    }

    private String normalizeManagedByRole(String managedByRole) {
        if (!StringUtils.hasText(managedByRole)) {
            return null;
        }

        String normalizedManagedByRole = managedByRole.trim().toUpperCase(Locale.ROOT);
        if (!ALLOWED_MANAGED_BY_ROLES.contains(normalizedManagedByRole)) {
            throw new BadRequestException("Managed by role is invalid.");
        }

        return normalizedManagedByRole;
    }

    private String normalizeFeatureCode(String featureCode) {
        if (!StringUtils.hasText(featureCode)) {
            throw new BadRequestException("Feature codes must not be blank.");
        }

        return featureCode.trim().toUpperCase(Locale.ROOT);
    }

    private void syncLegacyCompatibilityFields(ResourceEntity resource, ResourceType resourceType, Location location) {
        if (resourceType != null) {
            resource.setCategory(resourceType.getCategory());
            resource.setSubcategory(resourceType.getName());
        }

        if (location != null) {
            resource.setLocation(location.getLocationName());
        }
    }

    private String likeValue(String value) {
        return "%" + value.trim().toLowerCase(Locale.ROOT) + "%";
    }

    private String toManagedByRoleLabel(String role) {
        String[] parts = role.toLowerCase(Locale.ROOT).split("_");
        StringBuilder label = new StringBuilder();

        for (int index = 0; index < parts.length; index++) {
            if (parts[index].isEmpty()) {
                continue;
            }

            if (label.length() > 0) {
                label.append(' ');
            }

            label.append(Character.toUpperCase(parts[index].charAt(0)));
            if (parts[index].length() > 1) {
                label.append(parts[index].substring(1));
            }
        }

        return label.toString();
    }
}
