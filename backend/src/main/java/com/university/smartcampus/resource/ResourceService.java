package com.university.smartcampus.resource;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
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
import com.university.smartcampus.notification.NotificationService;
import com.university.smartcampus.resource.ResourceDtos.AvailabilityWindowRequest;
import com.university.smartcampus.resource.ResourceDtos.CreateResourceRequest;
import com.university.smartcampus.resource.ResourceDtos.LocationOption;
import com.university.smartcampus.resource.ResourceDtos.ManagedByRoleOption;
import com.university.smartcampus.resource.ResourceDtos.ResourceFeatureOption;
import com.university.smartcampus.resource.ResourceDtos.ResourceResponse;
import com.university.smartcampus.resource.ResourceDtos.ResourceSummary;
import com.university.smartcampus.resource.ResourceDtos.ResourceTypeOption;
import com.university.smartcampus.resource.ResourceDtos.UpdateResourceRequest;
import com.university.smartcampus.user.entity.UserEntity;

@Service
public class ResourceService {

    private static final List<DayOfWeek> ALL_DAYS_OF_WEEK = List.of(
        DayOfWeek.MONDAY,
        DayOfWeek.TUESDAY,
        DayOfWeek.WEDNESDAY,
        DayOfWeek.THURSDAY,
        DayOfWeek.FRIDAY,
        DayOfWeek.SATURDAY,
        DayOfWeek.SUNDAY
    );

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
    private final NotificationService notificationService;

    public ResourceService(
        ResourceRepository resourceRepository,
        ResourceTypeRepository resourceTypeRepository,
        LocationRepository locationRepository,
        ResourceFeatureRepository resourceFeatureRepository,
        ResourceMapper resourceMapper,
        NotificationService notificationService
    ) {
        this.resourceRepository = resourceRepository;
        this.resourceTypeRepository = resourceTypeRepository;
        this.locationRepository = locationRepository;
        this.resourceFeatureRepository = resourceFeatureRepository;
        this.resourceMapper = resourceMapper;
        this.notificationService = notificationService;
    }

    @Transactional
    public ResourceResponse createResource(CreateResourceRequest request) {
        return createResource(request, null);
    }

    @Transactional
    public ResourceResponse createResource(CreateResourceRequest request, UserEntity actor) {
        String normalizedCode = normalizeRequiredCode(request.code());
        String normalizedName = normalizeRequiredName(request.name());
        ensureCodeAvailable(normalizedCode, null);

        ResourceEntity resource = resourceMapper.toEntity(request);
        ResourceType resourceType = requireResourceType(request.resourceTypeId());
        Location location = request.locationId() == null ? null : requireLocation(request.locationId());
        Integer normalizedCapacity = resourceType.isCapacityEnabled() ? request.capacity() : null;
        Integer normalizedQuantity = resourceType.isQuantityEnabled() ? request.quantity() : null;
        List<ResourceAvailabilityWindow> normalizedAvailabilityWindows = resourceType.isAvailabilityEnabled()
            ? resolveAvailabilityWindows(request.availabilityWindows(), request.availableFrom(), request.availableTo())
            : List.of();
        AvailabilitySummary normalizedAvailability = summarizeAvailabilityWindows(normalizedAvailabilityWindows);
        validateResourceTypeDrivenFields(
            resourceType,
            request.locationId(),
            normalizedCapacity,
            normalizedAvailability.availableFrom(),
            normalizedAvailability.availableTo()
        );

        resource.setId(UUID.randomUUID());
        resource.setCode(normalizedCode);
        resource.setName(normalizedName);
        resource.setResourceType(resourceType);
        resource.setLocationEntity(location);
        resource.setManagedByRole(normalizeManagedByRole(request.managedByRole()));
        resource.setCapacity(normalizedCapacity);
        resource.setQuantity(normalizedQuantity);
        resource.setAvailabilityWindows(normalizedAvailabilityWindows);
        resource.setAvailableFrom(normalizedAvailability.availableFrom());
        resource.setAvailableTo(normalizedAvailability.availableTo());
        resource.setBookable(resourceType.isBookableDefault());
        resource.setMovable(resourceType.isMovableDefault());
        resource.setFeatures(resourceType.isFeaturesEnabled() ? resolveFeatures(request.featureCodes()) : new HashSet<>());
        syncLegacyCompatibilityFields(resource, resourceType, location);
        ResourceEntity saved = resourceRepository.save(resource);
        notificationService.notifyResourceCreated(saved, actor);
        return resourceMapper.toResourceResponse(saved);
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
                resourceType.isMovableDefault(),
                resourceType.isLocationRequired(),
                resourceType.isCapacityEnabled(),
                resourceType.isCapacityRequired(),
                resourceType.isQuantityEnabled(),
                resourceType.isAvailabilityEnabled(),
                resourceType.isFeaturesEnabled()
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
        return updateResource(id, request, null);
    }

    @Transactional
    public ResourceResponse updateResource(UUID id, UpdateResourceRequest request, UserEntity actor) {
        ResourceEntity resource = getResourceEntity(id);
        ResourceStatus oldStatus = resource.getStatus();
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
        } else if (request.resourceTypeId() != null && !nextResourceType.isLocationRequired()) {
            nextLocation = null;
            resource.setLocationEntity(null);
        }

        resourceMapper.applyUpdate(resource, request);
        if (normalizedName != null) {
            resource.setName(normalizedName);
        }
        if (request.managedByRole() != null) {
            resource.setManagedByRole(normalizeManagedByRole(request.managedByRole()));
        }
        resource.setBookable(nextResourceType.isBookableDefault());
        resource.setMovable(nextResourceType.isMovableDefault());
        if (!nextResourceType.isFeaturesEnabled()) {
            resource.setFeatures(new HashSet<>());
        } else if (request.featureCodes() != null) {
            resource.setFeatures(resolveFeatures(request.featureCodes()));
        }
        if (!nextResourceType.isCapacityEnabled()) {
            resource.setCapacity(null);
        }
        if (!nextResourceType.isQuantityEnabled()) {
            resource.setQuantity(null);
        }
        if (!nextResourceType.isAvailabilityEnabled()) {
            resource.setAvailabilityWindows(List.of());
            resource.setAvailableFrom(null);
            resource.setAvailableTo(null);
        } else if (request.availabilityWindows() != null || request.availableFrom() != null || request.availableTo() != null) {
            List<ResourceAvailabilityWindow> nextAvailabilityWindows = resolveAvailabilityWindows(
                request.availabilityWindows(),
                request.availableFrom(),
                request.availableTo()
            );
            AvailabilitySummary normalizedAvailability = summarizeAvailabilityWindows(nextAvailabilityWindows);
            resource.setAvailabilityWindows(nextAvailabilityWindows);
            resource.setAvailableFrom(normalizedAvailability.availableFrom());
            resource.setAvailableTo(normalizedAvailability.availableTo());
        }
        validateResourceTypeDrivenFields(
            nextResourceType,
            nextLocation == null ? null : nextLocation.getId(),
            resource.getCapacity(),
            resource.getAvailableFrom(),
            resource.getAvailableTo()
        );
        syncLegacyCompatibilityFields(resource, nextResourceType, nextLocation);

        notificationService.notifyResourceUpdated(resource, actor);
        notificationService.notifyResourceStatusChanged(resource, oldStatus, actor);
        return resourceMapper.toResourceResponse(resource);
    }

    @Transactional
    public MessageResponse deleteResource(UUID id) {
        return deleteResource(id, null);
    }

    @Transactional
    public MessageResponse deleteResource(UUID id, UserEntity actor) {
        ResourceEntity resource = getResourceEntity(id);
        ResourceStatus oldStatus = resource.getStatus();
        resource.setStatus(ResourceStatus.INACTIVE);
        notificationService.notifyResourceStatusChanged(resource, oldStatus, actor);
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

    private List<ResourceAvailabilityWindow> resolveAvailabilityWindows(
        List<AvailabilityWindowRequest> availabilityWindows,
        LocalTime availableFrom,
        LocalTime availableTo
    ) {
        if (availabilityWindows != null) {
            if (availabilityWindows.isEmpty()) {
                return List.of();
            }

            List<ResourceAvailabilityWindow> resolvedWindows = new ArrayList<>();
            Set<String> seenKeys = new LinkedHashSet<>();

            for (AvailabilityWindowRequest availabilityWindow : availabilityWindows) {
                DayOfWeek dayOfWeek = normalizeDayOfWeek(availabilityWindow);
                LocalTime startTime = availabilityWindow == null ? null : availabilityWindow.startTime();
                LocalTime endTime = availabilityWindow == null ? null : availabilityWindow.endTime();

                if (startTime == null || endTime == null) {
                    throw new BadRequestException("Availability window start and end times are required.");
                }

                if (!startTime.isBefore(endTime)) {
                    throw new BadRequestException("Each availability window must have a start time before its end time.");
                }

                String windowKey = dayOfWeek.name() + ":" + startTime + ":" + endTime;
                if (!seenKeys.add(windowKey)) {
                    throw new BadRequestException("Duplicate availability windows are not allowed.");
                }

                ResourceAvailabilityWindow resourceAvailabilityWindow = new ResourceAvailabilityWindow();
                resourceAvailabilityWindow.setId(UUID.randomUUID());
                resourceAvailabilityWindow.setDayOfWeek(dayOfWeek);
                resourceAvailabilityWindow.setStartTime(startTime);
                resourceAvailabilityWindow.setEndTime(endTime);
                resourceAvailabilityWindow.setActive(true);
                resolvedWindows.add(resourceAvailabilityWindow);
            }

            return resolvedWindows;
        }

        if (availableFrom == null && availableTo == null) {
            return List.of();
        }

        if (availableFrom == null || availableTo == null) {
            throw new BadRequestException("Availability start and end times must both be provided.");
        }

        if (!availableFrom.isBefore(availableTo)) {
            throw new BadRequestException("Availability start time must be before the end time.");
        }

        return ALL_DAYS_OF_WEEK.stream()
            .map(dayOfWeek -> {
                ResourceAvailabilityWindow resourceAvailabilityWindow = new ResourceAvailabilityWindow();
                resourceAvailabilityWindow.setId(UUID.randomUUID());
                resourceAvailabilityWindow.setDayOfWeek(dayOfWeek);
                resourceAvailabilityWindow.setStartTime(availableFrom);
                resourceAvailabilityWindow.setEndTime(availableTo);
                resourceAvailabilityWindow.setActive(true);
                return resourceAvailabilityWindow;
            })
            .toList();
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

    private DayOfWeek normalizeDayOfWeek(AvailabilityWindowRequest availabilityWindow) {
        if (availabilityWindow == null || !StringUtils.hasText(availabilityWindow.dayOfWeek())) {
            throw new BadRequestException("Availability window day of week is required.");
        }

        try {
            return DayOfWeek.valueOf(availabilityWindow.dayOfWeek().trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new BadRequestException("Availability window day of week is invalid.");
        }
    }

    private AvailabilitySummary summarizeAvailabilityWindows(List<ResourceAvailabilityWindow> availabilityWindows) {
        if (availabilityWindows == null || availabilityWindows.isEmpty()) {
            return new AvailabilitySummary(null, null);
        }

        LocalTime earliestStartTime = null;
        LocalTime latestEndTime = null;

        for (ResourceAvailabilityWindow availabilityWindow : availabilityWindows) {
            if (earliestStartTime == null || availabilityWindow.getStartTime().isBefore(earliestStartTime)) {
                earliestStartTime = availabilityWindow.getStartTime();
            }
            if (latestEndTime == null || availabilityWindow.getEndTime().isAfter(latestEndTime)) {
                latestEndTime = availabilityWindow.getEndTime();
            }
        }

        return new AvailabilitySummary(earliestStartTime, latestEndTime);
    }

    private void syncLegacyCompatibilityFields(ResourceEntity resource, ResourceType resourceType, Location location) {
        if (resourceType != null) {
            resource.setCategory(resourceType.getCategory());
            resource.setSubcategory(resourceType.getName());
        }

        resource.setLocation(location == null ? null : location.getLocationName());
    }

    private void validateResourceTypeDrivenFields(
        ResourceType resourceType,
        UUID locationId,
        Integer capacity,
        LocalTime availableFrom,
        LocalTime availableTo
    ) {
        if (resourceType.isLocationRequired() && locationId == null) {
            throw new BadRequestException("Location is required for the selected resource type.");
        }

        if (resourceType.isCapacityRequired() && capacity == null) {
            throw new BadRequestException("Capacity is required for the selected resource type.");
        }

        if (availableFrom == null && availableTo == null) {
            return;
        }

        if (!resourceType.isAvailabilityEnabled()) {
            throw new BadRequestException("Availability is not supported for the selected resource type.");
        }

        if (availableFrom == null || availableTo == null) {
            throw new BadRequestException("Availability start and end times must both be provided.");
        }

        if (!availableFrom.isBefore(availableTo)) {
            throw new BadRequestException("Availability start time must be before the end time.");
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

    private record AvailabilitySummary(
        LocalTime availableFrom,
        LocalTime availableTo
    ) {
    }
}
