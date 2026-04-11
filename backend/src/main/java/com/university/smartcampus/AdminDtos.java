package com.university.smartcampus;

import java.util.Set;

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
        @NotBlank String designation,
        String officeLocation,
        String officePhone
    ) {
    }

    public record AdminProfileInput(
        @NotBlank String firstName,
        @NotBlank String lastName,
        String preferredName,
        String phoneNumber,
        @NotBlank String employeeNumber,
        @NotBlank String department,
        @NotBlank String jobTitle,
        String officePhone
    ) {
    }

    public record ManagerProfileInput(
        @NotBlank String firstName,
        @NotBlank String lastName,
        String preferredName,
        String phoneNumber,
        @NotBlank String employeeNumber,
        @NotBlank String department,
        @NotBlank String jobTitle,
        String officeLocation
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
        Set<ManagerRole> managerRoles
    ) {
    }

    public record UpdateUserRequest(
        AccountStatus accountStatus,
        @Valid FacultyProfileInput facultyProfile,
        @Valid AdminProfileInput adminProfile,
        @Valid ManagerProfileInput managerProfile
    ) {
    }

    public record ManagerRolesUpdateRequest(Set<ManagerRole> managerRoles) {
    }
}
