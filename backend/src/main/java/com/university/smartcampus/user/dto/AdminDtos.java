package com.university.smartcampus.user.dto;

import com.university.smartcampus.common.enums.AppEnums.AccountStatus;
import com.university.smartcampus.common.enums.AppEnums.AcademicYear;
import com.university.smartcampus.common.enums.AppEnums.ManagerRole;
import com.university.smartcampus.common.enums.AppEnums.Semester;
import com.university.smartcampus.common.enums.AppEnums.StudentFaculty;
import com.university.smartcampus.common.enums.AppEnums.StudentProgram;
import com.university.smartcampus.common.enums.AppEnums.UserType;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public final class AdminDtos {

    private AdminDtos() {
    }

    public record StudentProfileInput(
        String firstName,
        String lastName,
        String preferredName,
        String phoneNumber,
        String registrationNumber,
        StudentFaculty facultyName,
        StudentProgram programName,
        AcademicYear academicYear,
        Semester semester,
        String profileImageUrl,
        Boolean emailNotificationsEnabled,
        Boolean smsNotificationsEnabled
    ) {
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
        @Valid StudentProfileInput studentProfile,
        @Valid FacultyProfileInput facultyProfile,
        @Valid AdminProfileInput adminProfile,
        @Valid ManagerProfileInput managerProfile
    ) {
    }

    public record ManagerRoleUpdateRequest(@NotNull ManagerRole managerRole) {
    }
}
