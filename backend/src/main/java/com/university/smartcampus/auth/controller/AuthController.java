package com.university.smartcampus.auth.controller;

import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.university.smartcampus.auth.dto.AuthDtos.LoginLinkRequest;
import com.university.smartcampus.auth.dto.AuthDtos.PasswordResetRequest;
import com.university.smartcampus.auth.dto.AuthDtos.SessionSyncResponse;
import com.university.smartcampus.auth.service.CurrentUserService;
import com.university.smartcampus.auth.service.LoginLinkRateLimiter;
import com.university.smartcampus.common.dto.ApiDtos.MessageResponse;
import com.university.smartcampus.common.dto.ApiDtos.UserResponse;
import com.university.smartcampus.user.service.UserManagementService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final String GENERIC_LOGIN_LINK_MESSAGE = "If the account exists, a sign-in email has been sent.";
    private static final String GENERIC_PASSWORD_RESET_MESSAGE = "If the account exists, a password reset email has been sent.";

    private final CurrentUserService currentUserService;
    private final UserManagementService userManagementService;
    private final LoginLinkRateLimiter loginLinkRateLimiter;

    public AuthController(
            CurrentUserService currentUserService,
            UserManagementService userManagementService,
            LoginLinkRateLimiter loginLinkRateLimiter) {
        this.currentUserService = currentUserService;
        this.userManagementService = userManagementService;
        this.loginLinkRateLimiter = loginLinkRateLimiter;
    }

    @PostMapping("/login-link/request")
    public MessageResponse requestLoginLink(
            @Valid @RequestBody LoginLinkRequest request,
            HttpServletRequest httpServletRequest) {
        if (!loginLinkRateLimiter.allow(request.email(), resolveClientIp(httpServletRequest))) {
            return new MessageResponse(GENERIC_LOGIN_LINK_MESSAGE);
        }

        return userManagementService.requestLoginLink(request.email());
    }

    @PostMapping("/password-reset/request")
    public MessageResponse requestPasswordReset(
            @Valid @RequestBody PasswordResetRequest request,
            HttpServletRequest httpServletRequest) {
        if (!loginLinkRateLimiter.allow(request.email(), resolveClientIp(httpServletRequest))) {
            return new MessageResponse(GENERIC_PASSWORD_RESET_MESSAGE);
        }

        return userManagementService.requestPasswordReset(request.email());
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

    private String resolveClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            String[] chain = forwardedFor.split(",");
            if (chain.length > 0 && !chain[0].isBlank()) {
                return chain[0].trim();
            }
        }

        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }

        return request.getRemoteAddr();
    }
}
