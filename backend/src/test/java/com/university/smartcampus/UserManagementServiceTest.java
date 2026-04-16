package com.university.smartcampus;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Transactional;

import com.university.smartcampus.common.dto.ApiDtos.UserResponse;
import com.university.smartcampus.common.enums.AppEnums.AccountStatus;
import com.university.smartcampus.common.enums.AppEnums.AcademicYear;
import com.university.smartcampus.common.enums.AppEnums.ManagerRole;
import com.university.smartcampus.common.enums.AppEnums.Semester;
import com.university.smartcampus.common.enums.AppEnums.StudentFaculty;
import com.university.smartcampus.common.enums.AppEnums.StudentProgram;
import com.university.smartcampus.common.enums.AppEnums.UserType;
import com.university.smartcampus.common.exception.BadRequestException;
import com.university.smartcampus.user.dto.AdminDtos.CreateUserRequest;
import com.university.smartcampus.user.dto.StudentDtos.StudentOnboardingRequest;
import com.university.smartcampus.user.entity.StudentEntity;
import com.university.smartcampus.user.entity.UserEntity;
import com.university.smartcampus.user.repository.UserRepository;
import com.university.smartcampus.user.service.UserManagementService;

@SpringBootTest
@Import(TestAuthProviderConfiguration.class)
@Transactional
class UserManagementServiceTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private UserManagementService userManagementService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TestAuthProviderConfiguration.RecordingAuthProviderClient recordingAuthProviderClient;

    @Autowired
    private TestAuthProviderConfiguration.RecordingAuthIdentityClient recordingAuthIdentityClient;

    @BeforeEach
    void resetProvider() {
        recordingAuthProviderClient.reset();
        recordingAuthIdentityClient.reset();
    }

    @Test
    void createUserCreatesManagerWithSingleRoleAndInvite() {
        CreateUserRequest request = new CreateUserRequest(
            "manager@campus.test",
            UserType.MANAGER,
            true,
            null,
            null,
            null,
            null,
            ManagerRole.CATALOG_MANAGER
        );

        UserResponse response = userManagementService.createUser(request);

        assertThat(response.userType()).isEqualTo(UserType.MANAGER);
        assertThat(response.managerRole()).isEqualTo(ManagerRole.CATALOG_MANAGER);
        assertThat(recordingAuthProviderClient.deliveries()).hasSize(1);
        assertThat(response.lastInviteReference()).isNotBlank();
        assertThat(response.inviteSendCount()).isEqualTo(1);
    }

    @Test
    void completeStudentOnboardingActivatesInvitedStudent() {
        UserEntity studentUser = seedStudent("student@campus.test");

        UserResponse response = userManagementService.completeStudentOnboarding(
            studentUser,
            new StudentOnboardingRequest(
                "Sara",
                "Student",
                "SS",
                "0711111111",
                "ST-2026-001",
                StudentFaculty.FACULTY_OF_COMPUTING,
                StudentProgram.BSC_HONS_IT_SOFTWARE_ENGINEERING,
                AcademicYear.YEAR_2,
                Semester.SEMESTER_1,
                null,
                true,
                false
            )
        );

        assertThat(response.studentProfile()).isNotNull();
        assertThat(response.studentProfile().onboardingCompleted()).isTrue();
        assertThat(response.accountStatus()).isEqualTo(AccountStatus.ACTIVE);
        assertThat(response.studentProfile().registrationNumber()).isEqualTo("ST-2026-001");

        UserEntity persisted = userRepository.findById(studentUser.getId()).orElseThrow();
        assertThat(persisted.isOnboardingCompleted()).isTrue();
        assertThat(persisted.getAccountStatus()).isEqualTo(AccountStatus.ACTIVE);
        assertThat(persisted.getStudentProfile().isOnboardingCompleted()).isTrue();
        assertThat(persisted.getStudentProfile().getRegistrationNumber()).isEqualTo("ST-2026-001");
    }

    @Test
    void completeStudentOnboardingRejectsProgramFromAnotherFaculty() {
        UserEntity studentUser = seedStudent("invalid-program@campus.test");

        assertThatThrownBy(() -> userManagementService.completeStudentOnboarding(
            studentUser,
            new StudentOnboardingRequest(
                "Sara",
                "Student",
                null,
                "0711111111",
                "ST-2026-002",
                StudentFaculty.FACULTY_OF_ENGINEERING,
                StudentProgram.BSC_HONS_IT_SOFTWARE_ENGINEERING,
                AcademicYear.YEAR_2,
                Semester.SEMESTER_1,
                null,
                true,
                false
            )
        ))
            .isInstanceOf(BadRequestException.class)
            .hasMessage("Program does not belong to the selected faculty.");
    }

    @Test
    void deleteUserRemovesUserAndDeletesAuthIdentity() {
        UserEntity studentUser = seedStudent("delete-me@campus.test");
        UUID authUserId = UUID.randomUUID();
        studentUser.setAuthUserId(authUserId);
        userRepository.saveAndFlush(studentUser);

        var response = userManagementService.deleteUser(studentUser.getId(), UUID.randomUUID());

        assertThat(response.message()).isEqualTo("User deleted.");
        assertThat(userRepository.findById(studentUser.getId())).isEmpty();
        assertThat(recordingAuthIdentityClient.deletedIdentityIds()).contains(authUserId);
    }

    @Test
    void deleteUserRejectsSelfDelete() {
        UserEntity studentUser = seedStudent("self-delete@campus.test");

        assertThatThrownBy(() -> userManagementService.deleteUser(studentUser.getId(), studentUser.getId()))
            .isInstanceOf(BadRequestException.class)
            .hasMessage("You cannot delete your own admin account.");
    }

    private UserEntity seedStudent(String email) {
        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());
        user.setEmail(email);
        user.setUserType(UserType.STUDENT);
        user.setAccountStatus(AccountStatus.INVITED);
        user.setInvitedAt(Instant.now());

        StudentEntity student = new StudentEntity();
        student.setUser(user);
        student.setOnboardingCompleted(false);
        user.setStudentProfile(student);

        return userRepository.save(user);
    }
}
