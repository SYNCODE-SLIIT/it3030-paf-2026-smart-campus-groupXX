package com.university.smartcampus;

import java.time.Instant;
import java.util.UUID;

import com.university.smartcampus.AppEnums.AccountStatus;
import com.university.smartcampus.AppEnums.AcademicYear;
import com.university.smartcampus.AppEnums.AuthDeliveryMethod;
import com.university.smartcampus.AppEnums.ManagerRole;
import com.university.smartcampus.AppEnums.Semester;
import com.university.smartcampus.AppEnums.StudentFaculty;
import com.university.smartcampus.AppEnums.StudentProgram;
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
        StudentFaculty facultyName,
        StudentProgram programName,
        AcademicYear academicYear,
        Semester semester,
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
        String designation
    ) {
    }

    public record AdminProfileResponse(
        String fullName,
        String phoneNumber,
        String employeeNumber
    ) {
    }

    public record ManagerProfileResponse(
        String firstName,
        String lastName,
        String preferredName,
        String phoneNumber,
        String employeeNumber
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
        ManagerRole managerRole,
        StudentProfileResponse studentProfile,
        FacultyProfileResponse facultyProfile,
        AdminProfileResponse adminProfile,
        ManagerProfileResponse managerProfile
    ) {
    }
}
