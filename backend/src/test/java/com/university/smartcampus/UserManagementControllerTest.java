package com.university.smartcampus;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.context.WebApplicationContext;

import com.university.smartcampus.AdminDtos.CreateUserRequest;
import com.university.smartcampus.AdminDtos.ManagerRolesUpdateRequest;
import com.university.smartcampus.AppEnums.AccountStatus;
import com.university.smartcampus.AppEnums.ManagerRole;
import com.university.smartcampus.AppEnums.UserType;
import tools.jackson.databind.ObjectMapper;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.webAppContextSetup;

@SpringBootTest
@Import(TestAuthProviderConfiguration.class)
class UserManagementControllerTest extends AbstractPostgresIntegrationTest {

    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TestAuthProviderConfiguration.RecordingAuthProviderClient recordingAuthProviderClient;

    @Autowired
    private TestAuthProviderConfiguration.RecordingAuthIdentityClient recordingAuthIdentityClient;

    @Autowired
    private WebApplicationContext context;

    @BeforeEach
    void setUp() {
        mockMvc = webAppContextSetup(context).apply(springSecurity()).build();
        recordingAuthProviderClient.reset();
        recordingAuthIdentityClient.reset();
        userRepository.deleteAll();
        seedAdmin("admin@campus.test");
    }

    @Test
    void adminCanCreateStudentUserAndInviteThem() throws Exception {
        CreateUserRequest request = new CreateUserRequest(
            "student@campus.test",
            UserType.STUDENT,
            true,
            new AdminDtos.StudentProfileInput(),
            null,
            null,
            null,
            null
        );

        mockMvc.perform(post("/api/admin/users")
                .with(jwtFor("admin@campus.test"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.email").value("student@campus.test"))
            .andExpect(jsonPath("$.userType").value("STUDENT"))
            .andExpect(jsonPath("$.studentProfile.onboardingCompleted").value(false))
            .andExpect(jsonPath("$.lastInviteReference").isNotEmpty());

        assertThat(recordingAuthProviderClient.deliveries()).hasSize(1);
    }

    @Test
    void rejectsManagerCreationWithoutManagerRoles() throws Exception {
        CreateUserRequest request = new CreateUserRequest(
            "manager-no-roles@campus.test",
            UserType.MANAGER,
            false,
            null,
            null,
            null,
            null,
            Set.of()
        );

        mockMvc.perform(post("/api/admin/users")
                .with(jwtFor("admin@campus.test"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest());
    }

    @Test
    void sessionSyncRejectsUnknownEmail() throws Exception {
        mockMvc.perform(post("/api/auth/session/sync")
                .with(jwtFor("unknown@campus.test")))
            .andExpect(status().isForbidden());
    }

    @Test
    void studentSessionSyncBindsIdentityAndRequiresOnboarding() throws Exception {
        seedStudent("new.student@campus.test", AccountStatus.INVITED, false);

        mockMvc.perform(post("/api/auth/session/sync")
                .with(jwt().jwt(jwt -> jwt.subject(UUID.randomUUID().toString()).claim("email", "new.student@campus.test"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.nextStep").value("ONBOARDING"))
            .andExpect(jsonPath("$.user.authUserId").isNotEmpty());
    }

    @Test
    void requestIsRejectedWhenBoundIdentityDoesNotMatchJwtSubject() throws Exception {
        UserEntity student = seedStudent("bound.student@campus.test", AccountStatus.ACTIVE, true);
        student.setAuthUserId(UUID.randomUUID());
        userRepository.saveAndFlush(student);

        mockMvc.perform(get("/api/auth/me")
                .with(jwt().jwt(jwt -> jwt
                    .subject(UUID.randomUUID().toString())
                    .claim("email", "bound.student@campus.test"))))
            .andExpect(status().isForbidden());
    }

    @Test
    void facultySessionSyncActivatesInvitedFacultyWithoutOnboarding() throws Exception {
        seedFaculty("faculty@campus.test", AccountStatus.INVITED);

        mockMvc.perform(post("/api/auth/session/sync")
                .with(jwtFor("faculty@campus.test")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.nextStep").value("DASHBOARD"))
            .andExpect(jsonPath("$.user.accountStatus").value("ACTIVE"));
    }

    @Test
    void suspendedUserIsBlockedFromSessionSync() throws Exception {
        seedFaculty("suspended@campus.test", AccountStatus.SUSPENDED);

        mockMvc.perform(post("/api/auth/session/sync")
                .with(jwtFor("suspended@campus.test")))
            .andExpect(status().isForbidden());
    }

    @Test
    void adminCanReplaceManagerRoles() throws Exception {
        UserEntity manager = seedManager("manager@campus.test", Set.of(ManagerRole.CATALOG_MANAGER));

        mockMvc.perform(put("/api/admin/users/{id}/manager-roles", manager.getId())
                .with(jwtFor("admin@campus.test"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new ManagerRolesUpdateRequest(Set.of(
                    ManagerRole.BOOKING_MANAGER,
                    ManagerRole.TICKET_MANAGER
                )))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.managerRoles[0]").exists());
    }

    @Test
    void adminCanResendInviteAndPublicLoginLinkRequestIsSafe() throws Exception {
        UserEntity student = seedStudent("resend@campus.test", AccountStatus.INVITED, false);

        mockMvc.perform(post("/api/admin/users/{id}/invite", student.getId())
                .with(jwtFor("admin@campus.test")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value("Access link generated."));

        mockMvc.perform(post("/api/auth/login-link/request")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"missing@campus.test\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value("If the account exists, an access link has been generated."));
    }

    @Test
    void adminCanDeleteUserFromSystem() throws Exception {
        UserEntity student = seedStudent("delete.user@campus.test", AccountStatus.ACTIVE, true);
        UUID authUserId = UUID.randomUUID();
        student.setAuthUserId(authUserId);
        userRepository.saveAndFlush(student);

        mockMvc.perform(delete("/api/admin/users/{id}", student.getId())
                .with(jwtFor("admin@campus.test")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value("User deleted."));

        assertThat(userRepository.findById(student.getId())).isEmpty();
        assertThat(recordingAuthIdentityClient.deletedIdentityIds()).contains(authUserId);
    }

    @Test
    void adminCannotDeleteOwnAccount() throws Exception {
        UserEntity admin = userRepository.findByEmailIgnoreCase("admin@campus.test").orElseThrow();

        mockMvc.perform(delete("/api/admin/users/{id}", admin.getId())
                .with(jwtFor("admin@campus.test")))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("You cannot delete your own admin account."));
    }

    @Test
    void studentCanCompleteOnboarding() throws Exception {
        seedStudent("onboarding@campus.test", AccountStatus.INVITED, false);

        mockMvc.perform(put("/api/students/me/onboarding")
                .with(jwtFor("onboarding@campus.test"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "firstName": "On",
                      "lastName": "Board",
                      "preferredName": "OB",
                      "phoneNumber": "0777777777",
                      "registrationNumber": "ST-001",
                      "facultyName": "Computing",
                      "programName": "IT",
                      "academicYear": 3,
                      "semester": "Semester 2",
                      "profileImageUrl": null,
                      "emailNotificationsEnabled": true,
                      "smsNotificationsEnabled": false
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accountStatus").value("ACTIVE"))
            .andExpect(jsonPath("$.studentProfile.onboardingCompleted").value(true))
            .andExpect(jsonPath("$.studentProfile.registrationNumber").value("ST-001"));
    }

    private void seedAdmin(String email) {
        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());
        user.setEmail(email);
        user.setUserType(UserType.ADMIN);
        user.setAccountStatus(AccountStatus.ACTIVE);
        user.setInvitedAt(Instant.now());
        user.setActivatedAt(Instant.now());

        AdminEntity admin = new AdminEntity();
        admin.setUser(user);
        admin.setFirstName("Admin");
        admin.setLastName("User");
        admin.setEmployeeNumber("ADM-001");
        admin.setDepartment("Operations");
        admin.setJobTitle("Administrator");
        user.setAdminProfile(admin);

        userRepository.save(user);
    }

    private UserEntity seedStudent(String email, AccountStatus status, boolean onboardingCompleted) {
        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());
        user.setEmail(email);
        user.setUserType(UserType.STUDENT);
        user.setAccountStatus(status);
        user.setInvitedAt(Instant.now());

        StudentEntity student = new StudentEntity();
        student.setUser(user);
        student.setOnboardingCompleted(onboardingCompleted);
        user.setStudentProfile(student);

        return userRepository.save(user);
    }

    private void seedFaculty(String email, AccountStatus status) {
        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());
        user.setEmail(email);
        user.setUserType(UserType.FACULTY);
        user.setAccountStatus(status);
        user.setInvitedAt(Instant.now());

        FacultyEntity faculty = new FacultyEntity();
        faculty.setUser(user);
        faculty.setFirstName("Faculty");
        faculty.setLastName("Member");
        faculty.setEmployeeNumber("FAC-001");
        faculty.setDepartment("Computing");
        faculty.setDesignation("Lecturer");
        user.setFacultyProfile(faculty);

        userRepository.save(user);
    }

    private UserEntity seedManager(String email, Set<ManagerRole> roles) {
        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());
        user.setEmail(email);
        user.setUserType(UserType.MANAGER);
        user.setAccountStatus(AccountStatus.ACTIVE);
        user.setInvitedAt(Instant.now());
        user.setActivatedAt(Instant.now());

        ManagerEntity manager = new ManagerEntity();
        manager.setUser(user);
        manager.setFirstName("Manager");
        manager.setLastName("User");
        manager.setEmployeeNumber("MGR-001");
        manager.setDepartment("Facilities");
        manager.setJobTitle("Manager");
        manager.setManagerRoles(roles);

        user.setManagerProfile(manager);
        return userRepository.save(user);
    }
}
