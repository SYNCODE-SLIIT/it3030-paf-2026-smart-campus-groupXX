package com.university.smartcampus;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record LoginLinkRequest(@NotBlank @Email String email) {
    }

    public record SessionSyncResponse(ApiDtos.UserResponse user, String nextStep) {
    }
}
