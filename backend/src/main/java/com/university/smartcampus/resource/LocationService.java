package com.university.smartcampus.resource;

import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.university.smartcampus.common.dto.ApiDtos.MessageResponse;
import com.university.smartcampus.common.exception.BadRequestException;
import com.university.smartcampus.common.exception.ConflictException;
import com.university.smartcampus.common.exception.NotFoundException;
import com.university.smartcampus.resource.BuildingDtos.BuildingResponse;
import com.university.smartcampus.resource.LocationDtos.CreateLocationRequest;
import com.university.smartcampus.resource.LocationDtos.LocationResponse;
import com.university.smartcampus.resource.LocationDtos.UpdateLocationRequest;

@Service
public class LocationService {

    private static final Set<String> ALLOWED_LOCATION_TYPES = Set.of(
        "BUILDING",
        "ROOM",
        "LAB",
        "HALL",
        "LIBRARY_SPACE",
        "EVENT_SPACE",
        "SPORTS_AREA",
        "OUTDOOR_AREA",
        "STORAGE",
        "OTHER"
    );

    private static final Set<String> ALLOWED_WINGS = Set.of(
        "LEFT_WING",
        "RIGHT_WING",
        "NONE"
    );

    private static final Set<String> LOCATION_TYPES_REQUIRING_WING = Set.of(
        "ROOM",
        "LAB",
        "HALL",
        "LIBRARY_SPACE",
        "EVENT_SPACE",
        "SPORTS_AREA",
        "STORAGE",
        "OTHER"
    );

    private static final Set<String> LOCATION_TYPES_REQUIRING_ROOM_CODE = Set.of(
        "ROOM",
        "LAB",
        "HALL",
        "LIBRARY_SPACE",
        "EVENT_SPACE",
        "STORAGE"
    );

    private final LocationRepository locationRepository;
    private final BuildingRepository buildingRepository;
    private final ResourceRepository resourceRepository;
    private final BuildingMapper buildingMapper;
    private final LocationMapper locationMapper;

    public LocationService(
        LocationRepository locationRepository,
        BuildingRepository buildingRepository,
        ResourceRepository resourceRepository,
        BuildingMapper buildingMapper,
        LocationMapper locationMapper
    ) {
        this.locationRepository = locationRepository;
        this.buildingRepository = buildingRepository;
        this.resourceRepository = resourceRepository;
        this.buildingMapper = buildingMapper;
        this.locationMapper = locationMapper;
    }

    @Transactional(readOnly = true)
    public List<LocationResponse> getLocations() {
        return locationRepository.findAllByOrderByLocationNameAsc().stream()
            .map(locationMapper::toResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<BuildingResponse> getBuildingOptions() {
        return buildingRepository.findAllByActiveTrueOrderByBuildingNameAsc().stream()
            .map(buildingMapper::toResponse)
            .toList();
    }

    @Transactional
    public LocationResponse createLocation(CreateLocationRequest request) {
        Building building = requireActiveBuilding(request.buildingId());
        String normalizedName = normalizeRequiredLocationName(request.locationName());
        String normalizedType = normalizeRequiredLocationType(request.locationType());
        String normalizedWing = normalizeWing(building, request.wing(), normalizedType);
        String normalizedRoomCode = normalizeRoomCode(building, normalizedWing, request.roomCode(), normalizedType);
        ensureLocationNameAvailable(normalizedName, building.getId(), null);
        ensureRoomCodeAvailable(normalizedRoomCode, building.getId(), null);

        Location location = locationMapper.toEntity(request);
        location.setBuilding(building);
        location.setBuildingName(building.getBuildingName());
        location.setWing(normalizedWing);
        location.setRoomCode(normalizedRoomCode);
        location.setLocationName(normalizedName);
        location.setLocationType(normalizedType);
        location.setFloor(trimToNull(request.floor()));

        return locationMapper.toResponse(locationRepository.save(location));
    }

    @Transactional
    public LocationResponse updateLocation(UUID id, UpdateLocationRequest request) {
        Location location = getLocation(id);
        Building nextBuilding = location.getBuilding();
        if (request.buildingId() != null) {
            nextBuilding = requireActiveBuilding(request.buildingId());
        }
        if (nextBuilding == null) {
            throw new BadRequestException("Building is required.");
        }

        String nextType = request.locationType() == null
            ? normalizeRequiredLocationType(location.getLocationType())
            : normalizeRequiredLocationType(request.locationType());
        String nextName = request.locationName() == null
            ? normalizeRequiredLocationName(location.getLocationName())
            : normalizeRequiredLocationName(request.locationName());
        String nextWing = request.wing() == null
            ? normalizeWing(nextBuilding, location.getWing(), nextType)
            : normalizeWing(nextBuilding, request.wing(), nextType);
        String nextRoomCode = request.roomCode() == null
            ? normalizeRoomCode(nextBuilding, nextWing, location.getRoomCode(), nextType)
            : normalizeRoomCode(nextBuilding, nextWing, request.roomCode(), nextType);

        ensureLocationNameAvailable(nextName, nextBuilding.getId(), id);
        ensureRoomCodeAvailable(nextRoomCode, nextBuilding.getId(), id);

        locationMapper.applyUpdate(location, request);
        location.setBuilding(nextBuilding);
        location.setBuildingName(nextBuilding.getBuildingName());
        location.setLocationName(nextName);
        location.setLocationType(nextType);
        location.setWing(nextWing);
        location.setRoomCode(nextRoomCode);

        return locationMapper.toResponse(location);
    }

    @Transactional
    public MessageResponse deleteLocation(UUID id) {
        if (resourceRepository.existsByLocationEntity_Id(id)) {
            throw new ConflictException("This location is already assigned to one or more resources and cannot be removed.");
        }

        Location location = getLocation(id);
        locationRepository.delete(location);
        return new MessageResponse("Location removed.");
    }

    private Location getLocation(UUID id) {
        return locationRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Location not found."));
    }

    private Building requireActiveBuilding(UUID buildingId) {
        Building building = buildingRepository.findById(buildingId)
            .orElseThrow(() -> new NotFoundException("Building not found."));
        if (!building.isActive()) {
            throw new BadRequestException("Inactive buildings cannot be assigned to locations.");
        }
        return building;
    }

    private String normalizeRequiredLocationName(String locationName) {
        if (!StringUtils.hasText(locationName)) {
            throw new BadRequestException("Location name is required.");
        }
        return locationName.trim();
    }

    private String normalizeRequiredLocationType(String locationType) {
        if (!StringUtils.hasText(locationType)) {
            throw new BadRequestException("Location type is required.");
        }
        String normalized = locationType.trim().toUpperCase(Locale.ROOT);
        if (!ALLOWED_LOCATION_TYPES.contains(normalized)) {
            throw new BadRequestException("Location type is invalid.");
        }
        return normalized;
    }

    private String normalizeWing(Building building, String wing, String locationType) {
        if (!building.isHasWings()) {
            return "NONE";
        }

        String normalizedWing = normalizeOptionalUpperValue(wing);
        if (!locationTypeRequiresWing(locationType)) {
            return normalizedWing == null ? "NONE" : requireAllowedWing(normalizedWing);
        }

        if (normalizedWing == null || "NONE".equals(normalizedWing)) {
            throw new BadRequestException("Wing is required for the selected building and location type.");
        }

        return requireAllowedWing(normalizedWing);
    }

    private String normalizeRoomCode(Building building, String wing, String roomCode, String locationType) {
        String normalizedRoomCode = normalizeOptionalUpperValue(roomCode);

        if (normalizedRoomCode == null) {
            if (roomCodeRequired(building, locationType)) {
                throw new BadRequestException("Room code is required for the selected building and location type.");
            }
            return null;
        }

        String expectedPrefix = resolveExpectedPrefix(building, wing);
        if (expectedPrefix != null && !normalizedRoomCode.startsWith(expectedPrefix)) {
            throw new BadRequestException("Room code must start with " + expectedPrefix + " for the selected building configuration.");
        }

        return normalizedRoomCode;
    }

    private boolean locationTypeRequiresWing(String locationType) {
        return LOCATION_TYPES_REQUIRING_WING.contains(locationType);
    }

    private boolean roomCodeRequired(Building building, String locationType) {
        return building.getBuildingType() != null
            && building.getBuildingType().name().equals("OUTDOOR")
            ? false
            : LOCATION_TYPES_REQUIRING_ROOM_CODE.contains(locationType);
    }

    private String resolveExpectedPrefix(Building building, String wing) {
        if (building.isHasWings()) {
            if ("LEFT_WING".equals(wing)) {
                return trimToNull(building.getLeftWingPrefix());
            }
            if ("RIGHT_WING".equals(wing)) {
                return trimToNull(building.getRightWingPrefix());
            }
            return null;
        }

        return trimToNull(building.getDefaultPrefix());
    }

    private String requireAllowedWing(String wing) {
        if (!ALLOWED_WINGS.contains(wing)) {
            throw new BadRequestException("Wing value is invalid.");
        }
        return wing;
    }

    private void ensureLocationNameAvailable(String locationName, UUID buildingId, UUID currentLocationId) {
        boolean exists = currentLocationId == null
            ? locationRepository.existsByLocationNameIgnoreCaseAndBuilding_Id(locationName, buildingId)
            : locationRepository.existsByLocationNameIgnoreCaseAndBuilding_IdAndIdNot(locationName, buildingId, currentLocationId);
        if (exists) {
            throw new ConflictException("A location with this name already exists for the selected building.");
        }
    }

    private void ensureRoomCodeAvailable(String roomCode, UUID buildingId, UUID currentLocationId) {
        if (roomCode == null) {
            return;
        }

        boolean exists = currentLocationId == null
            ? locationRepository.existsByRoomCodeIgnoreCaseAndBuilding_Id(roomCode, buildingId)
            : locationRepository.existsByRoomCodeIgnoreCaseAndBuilding_IdAndIdNot(roomCode, buildingId, currentLocationId);
        if (exists) {
            throw new ConflictException("A location with this room code already exists for the selected building.");
        }
    }

    private String normalizeOptionalUpperValue(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim().toUpperCase(Locale.ROOT);
    }

    private String trimToNull(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }
}
