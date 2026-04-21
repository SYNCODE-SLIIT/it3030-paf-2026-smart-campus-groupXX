package com.university.smartcampus.resource;

import org.springframework.stereotype.Component;

import com.university.smartcampus.resource.LocationDtos.CreateLocationRequest;
import com.university.smartcampus.resource.LocationDtos.LocationResponse;
import com.university.smartcampus.resource.LocationDtos.UpdateLocationRequest;

@Component
public class LocationMapper {

    public Location toEntity(CreateLocationRequest request) {
        Location location = new Location();
        location.setWing(trimToNull(request.wing()));
        location.setFloor(trimToNull(request.floor()));
        location.setRoomCode(trimToNull(request.roomCode()));
        location.setLocationName(trim(request.locationName()));
        location.setLocationType(trim(request.locationType()));
        location.setDescription(trimToNull(request.description()));
        return location;
    }

    public void applyUpdate(Location location, UpdateLocationRequest request) {
        if (request.wing() != null) {
            location.setWing(trimToNull(request.wing()));
        }
        if (request.floor() != null) {
            location.setFloor(trimToNull(request.floor()));
        }
        if (request.roomCode() != null) {
            location.setRoomCode(trimToNull(request.roomCode()));
        }
        if (request.locationName() != null) {
            location.setLocationName(trim(request.locationName()));
        }
        if (request.locationType() != null) {
            location.setLocationType(trim(request.locationType()));
        }
        if (request.description() != null) {
            location.setDescription(trimToNull(request.description()));
        }
    }

    public LocationResponse toResponse(Location location) {
        Building building = location.getBuilding();
        return new LocationResponse(
            location.getId(),
            building == null ? null : building.getId(),
            building == null ? location.getBuildingName() : building.getBuildingName(),
            building == null ? null : building.getBuildingCode(),
            building != null && building.isHasWings(),
            location.getWing(),
            location.getFloor(),
            location.getRoomCode(),
            location.getLocationName(),
            location.getLocationType(),
            location.getDescription()
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
