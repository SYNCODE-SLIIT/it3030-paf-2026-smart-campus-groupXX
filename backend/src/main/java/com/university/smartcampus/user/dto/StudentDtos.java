package com.university.smartcampus.user.dto;

import com.university.smartcampus.common.dto.ApiDtos;
import com.university.smartcampus.common.enums.AppEnums.AcademicYear;
import com.university.smartcampus.common.enums.AppEnums.Semester;
import com.university.smartcampus.common.enums.AppEnums.StudentFaculty;
import com.university.smartcampus.common.enums.AppEnums.StudentProgram;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Null;

public final class StudentDtos {

    private StudentDtos() {
    }

    public record StudentOnboardingRequest(
        @NotBlank String firstName,
        @NotBlank String lastName,
        String preferredName,
        @NotBlank String phoneNumber,
        @Null(message = "Registration number is auto-generated and cannot be provided.") String registrationNumber,
        @NotNull StudentFaculty facultyName,
        @NotNull StudentProgram programName,
        @NotNull AcademicYear academicYear,
        @NotNull Semester semester,
        String profileImageUrl
    ) {
    }

    public record StudentOnboardingStateResponse(
        boolean onboardingCompleted,
        ApiDtos.StudentProfileResponse profile
    ) {
    }
}
