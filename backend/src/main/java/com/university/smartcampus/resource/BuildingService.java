package com.university.smartcampus.resource;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.university.smartcampus.common.dto.ApiDtos.MessageResponse;
import com.university.smartcampus.common.exception.BadRequestException;
import com.university.smartcampus.common.exception.ConflictException;
import com.university.smartcampus.common.exception.NotFoundException;
import com.university.smartcampus.resource.BuildingDtos.BuildingResponse;
import com.university.smartcampus.resource.BuildingDtos.CreateBuildingRequest;
import com.university.smartcampus.resource.BuildingDtos.UpdateBuildingRequest;

@Service
public class BuildingService {

    private final BuildingRepository buildingRepository;
    private final BuildingMapper buildingMapper;

    public BuildingService(BuildingRepository buildingRepository, BuildingMapper buildingMapper) {
        this.buildingRepository = buildingRepository;
        this.buildingMapper = buildingMapper;
    }

    @Transactional(readOnly = true)
    public List<BuildingResponse> getBuildings() {
        return buildingRepository.findAllByOrderByBuildingNameAsc().stream()
            .map(buildingMapper::toResponse)
            .toList();
    }

    @Transactional
    public BuildingResponse createBuilding(CreateBuildingRequest request) {
        String normalizedName = normalizeRequiredName(request.buildingName());
        String normalizedCode = normalizeRequiredCode(request.buildingCode());

        ensureBuildingNameAvailable(normalizedName, null);
        ensureBuildingCodeAvailable(normalizedCode, null);

        Building building = buildingMapper.toEntity(request);
        building.setBuildingName(normalizedName);
        building.setBuildingCode(normalizedCode);
        normalizePrefixFields(building);

        return buildingMapper.toResponse(buildingRepository.save(building));
    }

    @Transactional
    public BuildingResponse updateBuilding(UUID id, UpdateBuildingRequest request) {
        Building building = getBuilding(id);
        String normalizedName = null;
        String normalizedCode = null;

        if (request.buildingName() != null) {
            normalizedName = normalizeRequiredName(request.buildingName());
            ensureBuildingNameAvailable(normalizedName, id);
        }

        if (request.buildingCode() != null) {
            normalizedCode = normalizeRequiredCode(request.buildingCode());
            ensureBuildingCodeAvailable(normalizedCode, id);
        }

        buildingMapper.applyUpdate(building, request);

        if (normalizedName != null) {
            building.setBuildingName(normalizedName);
        }

        if (normalizedCode != null) {
            building.setBuildingCode(normalizedCode);
        }

        normalizePrefixFields(building);

        return buildingMapper.toResponse(building);
    }

    @Transactional
    public MessageResponse deactivateBuilding(UUID id) {
        Building building = getBuilding(id);
        building.setActive(false);
        return new MessageResponse("Building deactivated.");
    }

    private Building getBuilding(UUID id) {
        return buildingRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Building not found."));
    }

    private String normalizeRequiredName(String buildingName) {
        if (!StringUtils.hasText(buildingName)) {
            throw new BadRequestException("Building name is required.");
        }
        return buildingName.trim();
    }

    private String normalizeRequiredCode(String buildingCode) {
        if (!StringUtils.hasText(buildingCode)) {
            throw new BadRequestException("Building code is required.");
        }
        return buildingCode.trim().toUpperCase(Locale.ROOT);
    }

    private void ensureBuildingNameAvailable(String buildingName, UUID currentId) {
        boolean exists = currentId == null
            ? buildingRepository.existsByBuildingNameIgnoreCase(buildingName)
            : buildingRepository.existsByBuildingNameIgnoreCaseAndIdNot(buildingName, currentId);
        if (exists) {
            throw new ConflictException("A building with this name already exists.");
        }
    }

    private void ensureBuildingCodeAvailable(String buildingCode, UUID currentId) {
        boolean exists = currentId == null
            ? buildingRepository.existsByBuildingCodeIgnoreCase(buildingCode)
            : buildingRepository.existsByBuildingCodeIgnoreCaseAndIdNot(buildingCode, currentId);
        if (exists) {
            throw new ConflictException("A building with this code already exists.");
        }
    }

    private void normalizePrefixFields(Building building) {
        String leftWingPrefix = trimToNull(building.getLeftWingPrefix());
        String rightWingPrefix = trimToNull(building.getRightWingPrefix());
        String defaultPrefix = trimToNull(building.getDefaultPrefix());

        if (building.isHasWings()) {
            if (leftWingPrefix == null && rightWingPrefix == null) {
                throw new BadRequestException("At least one wing prefix is required when wings are enabled.");
            }
            building.setLeftWingPrefix(leftWingPrefix);
            building.setRightWingPrefix(rightWingPrefix);
            building.setDefaultPrefix(null);
            return;
        }

        building.setLeftWingPrefix(null);
        building.setRightWingPrefix(null);
        building.setDefaultPrefix(defaultPrefix);
    }

    private String trimToNull(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }
}
