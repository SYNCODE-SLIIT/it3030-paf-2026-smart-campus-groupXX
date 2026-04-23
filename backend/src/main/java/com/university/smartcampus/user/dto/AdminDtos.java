package com.university.smartcampus.user.dto;

import java.util.List;
import java.util.UUID;

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
import jakarta.validation.constraints.Null;

public final class AdminDtos {

    private AdminDtos() {
    }

    public record StudentProfileInput(
        String firstName,
        String lastName,
        String preferredName,
        String phoneNumber,
        @Null(message = "Registration number is auto-generated and cannot be provided.") String registrationNumber,
        StudentFaculty facultyName,
        StudentProgram programName,
        AcademicYear academicYear,
        Semester semester,
        String profileImageUrl
    ) {
    }

    public record FacultyProfileInput(
        @NotBlank String firstName,
        @NotBlank String lastName,
        String preferredName,
        String phoneNumber,
        @Null(message = "Employee number is auto-generated and cannot be provided.") String employeeNumber,
        @NotBlank String department,
        @NotBlank String designation
    ) {
    }

    public record AdminProfileInput(
        @NotBlank String fullName,
        String phoneNumber,
        @Null(message = "Employee number is auto-generated and cannot be provided.") String employeeNumber
    ) {
    }

    public record ManagerProfileInput(
        @NotBlank String firstName,
        @NotBlank String lastName,
        String preferredName,
        String phoneNumber,
        @Null(message = "Employee number is auto-generated and cannot be provided.") String employeeNumber
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

    public record BulkStudentImportRequest(
        @Valid List<BulkStudentImportEntry> students
    ) {
    }

    public record BulkStudentImportEntry(
        Integer rowNumber,
        String email
    ) {
    }

    public enum BulkStudentImportStatus {
        VALID,
        CREATED,
        INVALID_EMAIL,
        DUPLICATE_IN_FILE,
        ALREADY_EXISTS,
        FAILED
    }

    public record BulkStudentImportSummary(
        int totalRows,
        int validRows,
        int createdRows,
        int skippedRows,
        int failedRows,
        int invalidRows,
        int duplicateRows,
        int existingRows
    ) {
    }

    public record BulkStudentImportRowResult(
        int rowNumber,
        String email,
        String normalizedEmail,
        BulkStudentImportStatus status,
        String message,
        UUID userId
    ) {
    }

    public record BulkStudentImportResponse(
        BulkStudentImportSummary summary,
        List<BulkStudentImportRowResult> results
    ) {
    }
}
