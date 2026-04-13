package com.university.smartcampus;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Transactional;

import com.university.smartcampus.AdminDtos.CreateUserRequest;
import com.university.smartcampus.ApiDtos.UserResponse;
import com.university.smartcampus.AppEnums.AccountStatus;
import com.university.smartcampus.AppEnums.ManagerRole;
import com.university.smartcampus.AppEnums.UserType;
import com.university.smartcampus.StudentDtos.StudentOnboardingRequest;

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
    void createUserCreatesManagerWithMultipleRolesAndInvite() {
        CreateUserRequest request = new CreateUserRequest(
            "manager@campus.test",
            UserType.MANAGER,
            true,
            null,
            null,
            null,
            null,
            Set.of(ManagerRole.CATALOG_MANAGER, ManagerRole.TICKET_MANAGER)
        );

        UserResponse response = userManagementService.createUser(request);

        assertThat(response.userType()).isEqualTo(UserType.MANAGER);
        assertThat(response.managerRoles()).containsExactlyInAnyOrder(
            ManagerRole.CATALOG_MANAGER,
            ManagerRole.TICKET_MANAGER
        );
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
                "Engineering",
                "Software Engineering",
                2,
                "Semester 1",
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
