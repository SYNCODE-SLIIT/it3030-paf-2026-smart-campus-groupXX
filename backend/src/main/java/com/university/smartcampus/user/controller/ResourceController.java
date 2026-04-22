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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.university.smartcampus.AppEnums.ResourceCategory;
import com.university.smartcampus.AppEnums.ResourceStatus;
import com.university.smartcampus.auth.service.CurrentUserService;
import com.university.smartcampus.common.dto.ApiDtos.MessageResponse;
import com.university.smartcampus.resource.ResourceDtos.CreateResourceRequest;
import com.university.smartcampus.resource.ResourceDtos.LocationOption;
import com.university.smartcampus.resource.ResourceDtos.ManagedByRoleOption;
import com.university.smartcampus.resource.ResourceDtos.ResourceFeatureOption;
import com.university.smartcampus.resource.ResourceDtos.ResourceResponse;
import com.university.smartcampus.resource.ResourceDtos.ResourceTypeOption;
import com.university.smartcampus.resource.ResourceDtos.UpdateResourceRequest;
import com.university.smartcampus.resource.ResourceService;
import com.university.smartcampus.user.entity.UserEntity;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/resources")
public class ResourceController {

    private final CurrentUserService currentUserService;
    private final ResourceService resourceService;

    public ResourceController(CurrentUserService currentUserService, ResourceService resourceService) {
        this.currentUserService = currentUserService;
        this.resourceService = resourceService;
    }

    @GetMapping
    public List<ResourceResponse> listResources(
        @RequestParam(required = false) String search,
        @RequestParam(required = false) ResourceCategory category,
        @RequestParam(required = false) ResourceStatus status,
        @RequestParam(required = false) String location,
        Authentication authentication
    ) {
        currentUserService.requireCurrentUserWithCompletedOnboarding(authentication);
        return resourceService.getResources(search, category, status, location);
    }

    @GetMapping("/{id}")
    public ResourceResponse getResource(@PathVariable UUID id, Authentication authentication) {
        currentUserService.requireCurrentUserWithCompletedOnboarding(authentication);
        return resourceService.getResourceById(id);
    }

    @GetMapping("/lookups/types")
    public List<ResourceTypeOption> listResourceTypeOptions(Authentication authentication) {
        currentUserService.requireCurrentUser(authentication);
        return resourceService.getResourceTypeOptions();
    }

    @GetMapping("/lookups/locations")
    public List<LocationOption> listLocationOptions(Authentication authentication) {
        currentUserService.requireCurrentUser(authentication);
        return resourceService.getLocationOptions();
    }

    @GetMapping("/lookups/features")
    public List<ResourceFeatureOption> listResourceFeatureOptions(Authentication authentication) {
        currentUserService.requireCurrentUser(authentication);
        return resourceService.getResourceFeatureOptions();
    }

    @GetMapping("/lookups/managed-roles")
    public List<ManagedByRoleOption> listManagedByRoleOptions(Authentication authentication) {
        currentUserService.requireCurrentUser(authentication);
        return resourceService.getManagedByRoleOptions();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResourceResponse createResource(@Valid @RequestBody CreateResourceRequest request, Authentication authentication) {
        UserEntity actor = currentUserService.requireAdminOrCatalogManager(authentication);
        return resourceService.createResource(request, actor);
    }

    @PatchMapping("/{id}")
    public ResourceResponse updateResource(
        @PathVariable UUID id,
        @Valid @RequestBody UpdateResourceRequest request,
        Authentication authentication
    ) {
        UserEntity actor = currentUserService.requireAdminOrCatalogManager(authentication);
        return resourceService.updateResource(id, request, actor);
    }

    @DeleteMapping("/{id}")
    public MessageResponse deleteResource(@PathVariable UUID id, Authentication authentication) {
        UserEntity actor = currentUserService.requireAdminOrCatalogManager(authentication);
        return resourceService.deleteResource(id, actor);
    }
}
