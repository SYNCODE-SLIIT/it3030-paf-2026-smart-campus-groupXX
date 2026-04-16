package com.university.smartcampus;

import com.university.smartcampus.AppEnums.AcademicYear;
import com.university.smartcampus.AppEnums.Semester;
import com.university.smartcampus.AppEnums.StudentFaculty;
import com.university.smartcampus.AppEnums.StudentProgram;

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
        @NotNull StudentFaculty facultyName,
        @NotNull StudentProgram programName,
        @NotNull AcademicYear academicYear,
        @NotNull Semester semester,
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
