package com.university.smartcampus;

import static org.assertj.core.api.Assertions.assertThat;

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

    @BeforeEach
    void resetProvider() {
        recordingAuthProviderClient.reset();
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
            new AdminDtos.ManagerProfileInput(
                "Maya",
                "Manager",
                null,
                "0700000000",
                "EMP-001",
                "Operations",
                "Facilities Lead",
                "Main Office"
            ),
            Set.of(ManagerRole.CATALOG_MANAGER, ManagerRole.TICKET_MANAGER)
        );

        UserResponse response = userManagementService.createUser(request);

        assertThat(response.userType()).isEqualTo(UserType.MANAGER);
        assertThat(response.managerRoles()).containsExactlyInAnyOrder(
            ManagerRole.CATALOG_MANAGER,
            ManagerRole.TICKET_MANAGER
        );
        assertThat(recordingAuthProviderClient.deliveries()).hasSize(1);
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

        assertThat(response.onboardingCompleted()).isTrue();
        assertThat(response.accountStatus()).isEqualTo(AccountStatus.ACTIVE);
        assertThat(response.studentProfile().registrationNumber()).isEqualTo("ST-2026-001");
    }

    private UserEntity seedStudent(String email) {
        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());
        user.setEmail(email);
        user.setUserType(UserType.STUDENT);
        user.setAccountStatus(AccountStatus.INVITED);
        user.setOnboardingCompleted(false);
        user.setInvitedAt(Instant.now());

        StudentEntity student = new StudentEntity();
        student.setUser(user);
        user.setStudentProfile(student);

        return userRepository.save(user);
    }
}
