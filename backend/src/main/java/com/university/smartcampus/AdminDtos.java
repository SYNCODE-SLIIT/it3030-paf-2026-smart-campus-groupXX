package com.university.smartcampus;

import com.university.smartcampus.AppEnums.AccountStatus;
import com.university.smartcampus.AppEnums.ManagerRole;
import com.university.smartcampus.AppEnums.UserType;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public final class AdminDtos {

    private AdminDtos() {
    }

    public record StudentProfileInput() {
    }

    public record FacultyProfileInput(
        @NotBlank String firstName,
        @NotBlank String lastName,
        String preferredName,
        String phoneNumber,
        @NotBlank String employeeNumber,
        @NotBlank String department,
        @NotBlank String designation
    ) {
    }

    public record AdminProfileInput(
        @NotBlank String fullName,
        String phoneNumber,
        @NotBlank String employeeNumber
    ) {
    }

    public record ManagerProfileInput(
        @NotBlank String firstName,
        @NotBlank String lastName,
        String preferredName,
        String phoneNumber,
        @NotBlank String employeeNumber
    ) {
    }

    public record CreateUserRequest(
        @NotBlank @Email String email,
        @NotNull UserType userType,
        boolean sendInvite,
        @Valid StudentProfileInput studentProfile,
        @Valid FacultyProfileInput facultyProfile,
        @Valid AdminProfileInput adminProfile,
        @Valid ManagerProfileInput managerProfile,
        ManagerRole managerRole
    ) {
    }

    public record UpdateUserRequest(
        AccountStatus accountStatus,
        @Valid FacultyProfileInput facultyProfile,
        @Valid AdminProfileInput adminProfile,
        @Valid ManagerProfileInput managerProfile
    ) {
    }

    public record ManagerRoleUpdateRequest(@NotNull ManagerRole managerRole) {
    }
}
