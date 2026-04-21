package com.university.smartcampus.user.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.university.smartcampus.common.dto.ApiDtos.MessageResponse;
import com.university.smartcampus.auth.service.CurrentUserService;
import com.university.smartcampus.resource.BuildingDtos.BuildingResponse;
import com.university.smartcampus.resource.BuildingDtos.CreateBuildingRequest;
import com.university.smartcampus.resource.BuildingDtos.UpdateBuildingRequest;
import com.university.smartcampus.resource.BuildingService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin/buildings")
public class AdminBuildingController {

    private final CurrentUserService currentUserService;
    private final BuildingService buildingService;

    public AdminBuildingController(CurrentUserService currentUserService, BuildingService buildingService) {
        this.currentUserService = currentUserService;
        this.buildingService = buildingService;
    }

    @GetMapping
    public List<BuildingResponse> listBuildings(Authentication authentication) {
        currentUserService.requireAdmin(authentication);
        return buildingService.getBuildings();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BuildingResponse createBuilding(@Valid @RequestBody CreateBuildingRequest request, Authentication authentication) {
        currentUserService.requireAdmin(authentication);
        return buildingService.createBuilding(request);
    }

    @PatchMapping("/{id}")
    public BuildingResponse updateBuilding(
        @PathVariable UUID id,
        @Valid @RequestBody UpdateBuildingRequest request,
        Authentication authentication
    ) {
        currentUserService.requireAdmin(authentication);
        return buildingService.updateBuilding(id, request);
    }

    @DeleteMapping("/{id}")
    public MessageResponse deactivateBuilding(@PathVariable UUID id, Authentication authentication) {
        currentUserService.requireAdmin(authentication);
        return buildingService.deactivateBuilding(id);
    }
}
