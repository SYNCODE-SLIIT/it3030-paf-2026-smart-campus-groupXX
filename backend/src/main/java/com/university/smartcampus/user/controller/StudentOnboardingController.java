package com.university.smartcampus.user.controller;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.university.smartcampus.auth.service.CurrentUserService;
import com.university.smartcampus.common.dto.ApiDtos.UserResponse;
import com.university.smartcampus.user.dto.StudentDtos.StudentOnboardingRequest;
import com.university.smartcampus.user.dto.StudentDtos.StudentOnboardingStateResponse;
import com.university.smartcampus.user.service.UserManagementService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/students/me/onboarding")
public class StudentOnboardingController {

    private final CurrentUserService currentUserService;
    private final UserManagementService userManagementService;

    public StudentOnboardingController(CurrentUserService currentUserService, UserManagementService userManagementService) {
        this.currentUserService = currentUserService;
        this.userManagementService = userManagementService;
    }

    @GetMapping
    public StudentOnboardingStateResponse getOnboarding(Authentication authentication) {
        return userManagementService.getStudentOnboarding(currentUserService.requireStudent(authentication));
    }

    @PutMapping
    public UserResponse completeOnboarding(
        @Valid @RequestBody StudentOnboardingRequest request,
        Authentication authentication
    ) {
        return userManagementService.completeStudentOnboarding(
            currentUserService.requireStudent(authentication),
            request
        );
    }
}
