package com.university.smartcampus.user.controller;

import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.university.smartcampus.auth.service.CurrentUserService;
import com.university.smartcampus.common.dto.ApiDtos.UserResponse;
import com.university.smartcampus.user.service.UserManagementService;

@RestController
@RequestMapping("/api/students/me/profile-image")
public class StudentProfileImageController {

    private final CurrentUserService currentUserService;
    private final UserManagementService userManagementService;

    public StudentProfileImageController(
            CurrentUserService currentUserService,
            UserManagementService userManagementService) {
        this.currentUserService = currentUserService;
        this.userManagementService = userManagementService;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public UserResponse uploadProfileImage(
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {
        return userManagementService.uploadStudentProfileImage(
                currentUserService.requireStudent(authentication),
                file);
    }
}
