package com.university.smartcampus;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

import com.university.smartcampus.AppEnums.AccountStatus;
import com.university.smartcampus.AppEnums.AuthDeliveryMethod;
import com.university.smartcampus.AppEnums.ManagerRole;
import com.university.smartcampus.AppEnums.UserType;

public final class ApiDtos {

    private ApiDtos() {
    }

    public record MessageResponse(String message) {
    }

    public record ErrorResponse(Instant timestamp, int status, String error, String message, String path) {
    }

    public record StudentProfileResponse(
        boolean onboardingCompleted,
        String firstName,
        String lastName,
        String preferredName,
        String phoneNumber,
        String registrationNumber,
        String facultyName,
        String programName,
        Integer academicYear,
        String semester,
        String profileImageUrl,
        Boolean emailNotificationsEnabled,
        Boolean smsNotificationsEnabled
    ) {
    }

    public record FacultyProfileResponse(
        String firstName,
        String lastName,
        String preferredName,
        String phoneNumber,
        String employeeNumber,
        String department,
        String designation,
        String officeLocation,
        String officePhone
    ) {
    }

    public record AdminProfileResponse(
        String firstName,
        String lastName,
        String preferredName,
        String phoneNumber,
        String employeeNumber,
        String department,
        String jobTitle,
        String officePhone
    ) {
    }

    public record ManagerProfileResponse(
        String firstName,
        String lastName,
        String preferredName,
        String phoneNumber,
        String employeeNumber,
        String department,
        String jobTitle,
        String officeLocation
    ) {
    }

    public record UserResponse(
        UUID id,
        UUID authUserId,
        String email,
        UserType userType,
        AccountStatus accountStatus,
        Instant lastLoginAt,
        Instant invitedAt,
        Instant activatedAt,
        Instant lastInviteSentAt,
        int inviteSendCount,
        AuthDeliveryMethod lastInviteMethod,
        String lastInviteReference,
        String lastInviteRedirectUri,
        Set<ManagerRole> managerRoles,
        StudentProfileResponse studentProfile,
        FacultyProfileResponse facultyProfile,
        AdminProfileResponse adminProfile,
        ManagerProfileResponse managerProfile
    ) {
    }
}
