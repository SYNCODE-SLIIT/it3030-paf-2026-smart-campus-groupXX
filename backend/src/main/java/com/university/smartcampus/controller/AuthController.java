package com.university.smartcampus.controller;

import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.university.smartcampus.ApiDtos.MessageResponse;
import com.university.smartcampus.ApiDtos.UserResponse;
import com.university.smartcampus.AuthDtos.LoginLinkRequest;
import com.university.smartcampus.AuthDtos.SessionSyncResponse;
import com.university.smartcampus.CurrentUserService;
import com.university.smartcampus.UserManagementService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final CurrentUserService currentUserService;
    private final UserManagementService userManagementService;

    public AuthController(CurrentUserService currentUserService, UserManagementService userManagementService) {
        this.currentUserService = currentUserService;
        this.userManagementService = userManagementService;
    }

    @PostMapping("/login-link/request")
    public MessageResponse requestLoginLink(@Valid @RequestBody LoginLinkRequest request) {
        return userManagementService.requestLoginLink(request.email());
    }

    @PostMapping("/session/sync")
    public SessionSyncResponse syncSession(Authentication authentication) {
        Jwt jwt = currentUserService.requireJwt(authentication);
        return userManagementService.syncSession(jwt);
    }

    @GetMapping("/me")
    public UserResponse me(Authentication authentication) {
        return userManagementService.currentUser(currentUserService.requireCurrentUser(authentication));
    }
}
