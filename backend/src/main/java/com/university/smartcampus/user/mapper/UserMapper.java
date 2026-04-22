package com.university.smartcampus.user.mapper;

import org.springframework.stereotype.Component;

import com.university.smartcampus.common.dto.ApiDtos.AdminProfileResponse;
import com.university.smartcampus.common.dto.ApiDtos.FacultyProfileResponse;
import com.university.smartcampus.common.dto.ApiDtos.ManagerProfileResponse;
import com.university.smartcampus.common.dto.ApiDtos.StudentProfileResponse;
import com.university.smartcampus.common.dto.ApiDtos.UserResponse;
import com.university.smartcampus.common.enums.AppEnums;
import com.university.smartcampus.user.entity.AdminEntity;
import com.university.smartcampus.user.entity.FacultyEntity;
import com.university.smartcampus.user.entity.ManagerEntity;
import com.university.smartcampus.user.entity.StudentEntity;
import com.university.smartcampus.user.entity.UserEntity;

@Component
public class UserMapper {

    public UserResponse toUserResponse(UserEntity user) {
        return new UserResponse(
            user.getId(),
            user.getAuthUserId(),
            user.getEmail(),
            user.getUserType(),
            user.getAccountStatus(),
            user.getLastLoginAt(),
            user.getInvitedAt(),
            user.getActivatedAt(),
            user.getLastInviteSentAt(),
            user.getInviteSendCount(),
            user.getLastInviteMethod(),
            user.getLastInviteReference(),
            user.getLastInviteRedirectUri(),
            managerRole(user),
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
            student.isOnboardingCompleted(),
            student.getFirstName(),
            student.getLastName(),
            student.getPreferredName(),
            student.getPhoneNumber(),
            student.getRegistrationNumber(),
            student.getFacultyName(),
            student.getProgramName(),
            student.getAcademicYear(),
            student.getSemester(),
            student.getProfileImageUrl()
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
            faculty.getDesignation()
        );
    }

    private AdminProfileResponse toAdminProfile(AdminEntity admin) {
        if (admin == null) {
            return null;
        }

        return new AdminProfileResponse(
            admin.getFullName(),
            admin.getPhoneNumber(),
            admin.getEmployeeNumber()
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
            manager.getEmployeeNumber()
        );
    }

    private AppEnums.ManagerRole managerRole(UserEntity user) {
        if (user.getManagerProfile() == null) {
            return null;
        }

        return user.getManagerProfile().getManagerRole();
    }
}
