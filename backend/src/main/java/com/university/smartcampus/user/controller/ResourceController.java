package com.university.smartcampus.user.controller;

import java.util.List;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.university.smartcampus.auth.service.CurrentUserService;
import com.university.smartcampus.booking.ResourceDtos.ResourceResponse;
import com.university.smartcampus.booking.ResourceService;

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
    public List<ResourceResponse> listResources(Authentication authentication) {
        currentUserService.requireCurrentUser(authentication);
        return resourceService.listActiveResources();
    }
}
