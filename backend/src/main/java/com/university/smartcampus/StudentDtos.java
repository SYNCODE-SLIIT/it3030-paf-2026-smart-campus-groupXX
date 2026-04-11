package com.university.smartcampus;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public final class StudentDtos {

    private StudentDtos() {
    }

    public record StudentOnboardingRequest(
        @NotBlank String firstName,
        @NotBlank String lastName,
        String preferredName,
        @NotBlank String phoneNumber,
        @NotBlank String registrationNumber,
        @NotBlank String facultyName,
        @NotBlank String programName,
        @NotNull @Min(1) @Max(12) Integer academicYear,
        String semester,
        String profileImageUrl,
        Boolean emailNotificationsEnabled,
        Boolean smsNotificationsEnabled
    ) {
    }

    public record StudentOnboardingStateResponse(
        boolean onboardingCompleted,
        ApiDtos.StudentProfileResponse profile
    ) {
    }
}
