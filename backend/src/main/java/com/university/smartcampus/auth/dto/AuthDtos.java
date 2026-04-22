package com.university.smartcampus.auth.dto;

import com.university.smartcampus.common.dto.ApiDtos;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record LoginLinkRequest(@NotBlank @Email String email) {
    }

    public record PasswordResetRequest(@NotBlank @Email String email) {
    }

    public record SessionSyncResponse(ApiDtos.UserResponse user, String nextStep) {
    }
}
