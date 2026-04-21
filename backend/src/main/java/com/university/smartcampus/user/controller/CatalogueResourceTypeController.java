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
import com.university.smartcampus.resource.ResourceTypeDtos.CreateResourceTypeRequest;
import com.university.smartcampus.resource.ResourceTypeDtos.ResourceTypeResponse;
import com.university.smartcampus.resource.ResourceTypeDtos.UpdateResourceTypeRequest;
import com.university.smartcampus.resource.ResourceTypeService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/catalog/resource-types")
public class CatalogueResourceTypeController {

    private final CurrentUserService currentUserService;
    private final ResourceTypeService resourceTypeService;

    public CatalogueResourceTypeController(CurrentUserService currentUserService, ResourceTypeService resourceTypeService) {
        this.currentUserService = currentUserService;
        this.resourceTypeService = resourceTypeService;
    }

    @GetMapping
    public List<ResourceTypeResponse> listResourceTypes(Authentication authentication) {
        currentUserService.requireAdminOrCatalogManager(authentication);
        return resourceTypeService.getResourceTypes();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResourceTypeResponse createResourceType(
        @Valid @RequestBody CreateResourceTypeRequest request,
        Authentication authentication
    ) {
        currentUserService.requireAdminOrCatalogManager(authentication);
        return resourceTypeService.createResourceType(request);
    }

    @PatchMapping("/{id}")
    public ResourceTypeResponse updateResourceType(
        @PathVariable UUID id,
        @Valid @RequestBody UpdateResourceTypeRequest request,
        Authentication authentication
    ) {
        currentUserService.requireAdminOrCatalogManager(authentication);
        return resourceTypeService.updateResourceType(id, request);
    }

    @DeleteMapping("/{id}")
    public MessageResponse deleteResourceType(@PathVariable UUID id, Authentication authentication) {
        currentUserService.requireAdminOrCatalogManager(authentication);
        return resourceTypeService.deleteResourceType(id);
    }
}
