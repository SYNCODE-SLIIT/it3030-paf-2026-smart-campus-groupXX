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

import com.university.smartcampus.auth.service.CurrentUserService;
import com.university.smartcampus.common.dto.ApiDtos.MessageResponse;
import com.university.smartcampus.resource.BuildingDtos.BuildingResponse;
import com.university.smartcampus.resource.LocationDtos.CreateLocationRequest;
import com.university.smartcampus.resource.LocationDtos.LocationResponse;
import com.university.smartcampus.resource.LocationDtos.UpdateLocationRequest;
import com.university.smartcampus.resource.LocationService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/catalog")
public class CatalogueLocationController {

    private final CurrentUserService currentUserService;
    private final LocationService locationService;

    public CatalogueLocationController(CurrentUserService currentUserService, LocationService locationService) {
        this.currentUserService = currentUserService;
        this.locationService = locationService;
    }

    @GetMapping("/buildings")
    public List<BuildingResponse> listBuildings(Authentication authentication) {
        currentUserService.requireAdminOrCatalogManager(authentication);
        return locationService.getBuildingOptions();
    }

    @GetMapping("/locations")
    public List<LocationResponse> listLocations(Authentication authentication) {
        currentUserService.requireAdminOrCatalogManager(authentication);
        return locationService.getLocations();
    }

    @PostMapping("/locations")
    @ResponseStatus(HttpStatus.CREATED)
    public LocationResponse createLocation(@Valid @RequestBody CreateLocationRequest request, Authentication authentication) {
        currentUserService.requireAdminOrCatalogManager(authentication);
        return locationService.createLocation(request);
    }

    @PatchMapping("/locations/{id}")
    public LocationResponse updateLocation(
        @PathVariable UUID id,
        @Valid @RequestBody UpdateLocationRequest request,
        Authentication authentication
    ) {
        currentUserService.requireAdminOrCatalogManager(authentication);
        return locationService.updateLocation(id, request);
    }

    @DeleteMapping("/locations/{id}")
    public MessageResponse deleteLocation(@PathVariable UUID id, Authentication authentication) {
        currentUserService.requireAdminOrCatalogManager(authentication);
        return locationService.deleteLocation(id);
    }
}
