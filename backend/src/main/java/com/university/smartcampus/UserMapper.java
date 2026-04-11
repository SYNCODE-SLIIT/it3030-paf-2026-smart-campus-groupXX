package com.university.smartcampus;

import java.util.Set;

import org.springframework.stereotype.Component;

import com.university.smartcampus.ApiDtos.AdminProfileResponse;
import com.university.smartcampus.ApiDtos.FacultyProfileResponse;
import com.university.smartcampus.ApiDtos.ManagerProfileResponse;
import com.university.smartcampus.ApiDtos.StudentProfileResponse;
import com.university.smartcampus.ApiDtos.UserResponse;

@Component
public class UserMapper {

    public UserResponse toUserResponse(UserEntity user) {
        return new UserResponse(
            user.getId(),
            user.getAuthUserId(),
            user.getEmail(),
            user.getUserType(),
            user.getAccountStatus(),
            user.isOnboardingCompleted(),
            user.getLastLoginAt(),
            user.getInvitedAt(),
            user.getActivatedAt(),
            managerRoles(user),
            toStudentProfile(user.getStudentProfile()),
            toFacultyProfile(user.getFacultyProfile()),
            toAdminProfile(user.getAdminProfile()),
            toManagerProfile(user.getManagerProfile())
        );
    }

    public StudentProfileResponse toStudentProfile(StudentEntity student) {
        if (student == null) {
            return null;
        }

        return new StudentProfileResponse(
            student.getFirstName(),
            student.getLastName(),
            student.getPreferredName(),
            student.getPhoneNumber(),
            student.getRegistrationNumber(),
            student.getFacultyName(),
            student.getProgramName(),
            student.getAcademicYear(),
            student.getSemester(),
            student.getProfileImageUrl(),
            student.getEmailNotificationsEnabled(),
            student.getSmsNotificationsEnabled()
        );
    }

    private FacultyProfileResponse toFacultyProfile(FacultyEntity faculty) {
        if (faculty == null) {
            return null;
        }

        return new FacultyProfileResponse(
            faculty.getFirstName(),
            faculty.getLastName(),
            faculty.getPreferredName(),
            faculty.getPhoneNumber(),
            faculty.getEmployeeNumber(),
            faculty.getDepartment(),
            faculty.getDesignation(),
            faculty.getOfficeLocation(),
            faculty.getOfficePhone()
        );
    }

    private AdminProfileResponse toAdminProfile(AdminEntity admin) {
        if (admin == null) {
            return null;
        }

        return new AdminProfileResponse(
            admin.getFirstName(),
            admin.getLastName(),
            admin.getPreferredName(),
            admin.getPhoneNumber(),
            admin.getEmployeeNumber(),
            admin.getDepartment(),
            admin.getJobTitle(),
            admin.getOfficePhone()
        );
    }

    private ManagerProfileResponse toManagerProfile(ManagerEntity manager) {
        if (manager == null) {
            return null;
        }

        return new ManagerProfileResponse(
            manager.getFirstName(),
            manager.getLastName(),
            manager.getPreferredName(),
            manager.getPhoneNumber(),
            manager.getEmployeeNumber(),
            manager.getDepartment(),
            manager.getJobTitle(),
            manager.getOfficeLocation()
        );
    }

    private Set<AppEnums.ManagerRole> managerRoles(UserEntity user) {
        if (user.getManagerProfile() == null) {
            return Set.of();
        }

        return user.getManagerProfile().getManagerRoles();
    }
}
