package com.university.smartcampus;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.time.Year;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import java.util.stream.IntStream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.context.WebApplicationContext;

import com.university.smartcampus.common.enums.AppEnums.AccountStatus;
import com.university.smartcampus.common.enums.AppEnums.ManagerRole;
import com.university.smartcampus.common.enums.AppEnums.UserType;
import com.university.smartcampus.AppEnums.BookingStatus;
import com.university.smartcampus.AppEnums.ResourceCategory;
import com.university.smartcampus.AppEnums.ResourceStatus;
import com.university.smartcampus.booking.BookingEntity;
import com.university.smartcampus.booking.BookingRepository;
import com.university.smartcampus.resource.ResourceEntity;
import com.university.smartcampus.resource.ResourceRepository;
import com.university.smartcampus.user.dto.AdminDtos;
import com.university.smartcampus.user.dto.AdminDtos.BulkStudentImportEntry;
import com.university.smartcampus.user.dto.AdminDtos.BulkStudentImportRequest;
import com.university.smartcampus.user.dto.AdminDtos.CreateUserRequest;
import com.university.smartcampus.user.dto.AdminDtos.ManagerRoleUpdateRequest;
import com.university.smartcampus.user.entity.AdminEntity;
import com.university.smartcampus.user.entity.FacultyEntity;
import com.university.smartcampus.user.entity.ManagerEntity;
import com.university.smartcampus.user.entity.StudentEntity;
import com.university.smartcampus.user.entity.UserEntity;
import com.university.smartcampus.user.repository.UserRepository;
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
    private BookingRepository bookingRepository;

    @Autowired
    private ResourceRepository resourceRepository;

    @Autowired
    private TestAuthProviderConfiguration.RecordingAuthProviderClient recordingAuthProviderClient;

    @Autowired
    private TestAuthProviderConfiguration.RecordingAuthIdentityClient recordingAuthIdentityClient;

    @Autowired
    private TestAuthProviderConfiguration.RecordingProfileImageStorageClient recordingProfileImageStorageClient;

    @Autowired
    private WebApplicationContext context;

    @BeforeEach
    void setUp() {
        mockMvc = webAppContextSetup(context).apply(springSecurity()).build();
        recordingAuthProviderClient.reset();
        recordingAuthIdentityClient.reset();
        recordingProfileImageStorageClient.reset();
        userRepository.deleteAll();
        seedAdmin("admin@campus.test");
    }

    @Test
    void adminCanCreateStudentUserAndInviteThem() throws Exception {
        CreateUserRequest request = new CreateUserRequest(
            "student@campus.test",
            UserType.STUDENT,
            true,
            null,
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
    void adminCanPreviewBulkStudentImportWithMixedRows() throws Exception {
        seedStudent("existing.bulk@campus.test", AccountStatus.INVITED, false);
        BulkStudentImportRequest request = new BulkStudentImportRequest(List.of(
            new BulkStudentImportEntry(2, "New.Student@Campus.Test "),
            new BulkStudentImportEntry(3, "not-an-email"),
            new BulkStudentImportEntry(4, "new.student@campus.test"),
            new BulkStudentImportEntry(5, "existing.bulk@campus.test")
        ));

        mockMvc.perform(post("/api/admin/users/bulk-students/preview")
                .with(jwtFor("admin@campus.test"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.summary.totalRows").value(4))
            .andExpect(jsonPath("$.summary.validRows").value(1))
            .andExpect(jsonPath("$.summary.invalidRows").value(1))
            .andExpect(jsonPath("$.summary.duplicateRows").value(1))
            .andExpect(jsonPath("$.summary.existingRows").value(1))
            .andExpect(jsonPath("$.summary.skippedRows").value(3))
            .andExpect(jsonPath("$.results[0].normalizedEmail").value("new.student@campus.test"))
            .andExpect(jsonPath("$.results[0].status").value("VALID"))
            .andExpect(jsonPath("$.results[1].status").value("INVALID_EMAIL"))
            .andExpect(jsonPath("$.results[2].status").value("DUPLICATE_IN_FILE"))
            .andExpect(jsonPath("$.results[3].status").value("ALREADY_EXISTS"));

        assertThat(recordingAuthProviderClient.deliveries()).isEmpty();
    }

    @Test
    void adminCanImportBulkStudentUsersAndSkipsInvalidRows() throws Exception {
        seedStudent("existing.import@campus.test", AccountStatus.INVITED, false);
        BulkStudentImportRequest request = new BulkStudentImportRequest(List.of(
            new BulkStudentImportEntry(2, "bulk-one@campus.test"),
            new BulkStudentImportEntry(3, "bulk-two@campus.test"),
            new BulkStudentImportEntry(4, "bulk-one@campus.test"),
            new BulkStudentImportEntry(5, "bad-address"),
            new BulkStudentImportEntry(6, "existing.import@campus.test")
        ));

        mockMvc.perform(post("/api/admin/users/bulk-students")
                .with(jwtFor("admin@campus.test"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.summary.createdRows").value(2))
            .andExpect(jsonPath("$.summary.invalidRows").value(1))
            .andExpect(jsonPath("$.summary.duplicateRows").value(1))
            .andExpect(jsonPath("$.summary.existingRows").value(1))
            .andExpect(jsonPath("$.summary.skippedRows").value(3))
            .andExpect(jsonPath("$.results[0].status").value("CREATED"))
            .andExpect(jsonPath("$.results[1].status").value("CREATED"))
            .andExpect(jsonPath("$.results[2].status").value("DUPLICATE_IN_FILE"))
            .andExpect(jsonPath("$.results[3].status").value("INVALID_EMAIL"))
            .andExpect(jsonPath("$.results[4].status").value("ALREADY_EXISTS"));

        UserEntity imported = userRepository.findByEmailIgnoreCase("bulk-one@campus.test").orElseThrow();
        assertThat(imported.getUserType()).isEqualTo(UserType.STUDENT);
        assertThat(imported.getAccountStatus()).isEqualTo(AccountStatus.INVITED);
        assertThat(imported.getStudentProfile()).isNotNull();
        assertThat(imported.getStudentProfile().isOnboardingCompleted()).isFalse();
        assertThat(imported.getStudentProfile().getFirstName()).isNull();
        assertThat(recordingAuthProviderClient.deliveries()).hasSize(2);
    }

    @Test
    void bulkStudentImportRequiresAdminAccess() throws Exception {
        seedStudent("student.no.bulk@campus.test", AccountStatus.ACTIVE, true);
        BulkStudentImportRequest request = new BulkStudentImportRequest(List.of(
            new BulkStudentImportEntry(1, "bulk-auth@campus.test")
        ));

        mockMvc.perform(post("/api/admin/users/bulk-students/preview")
                .with(jwtFor("student.no.bulk@campus.test"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/admin/users/bulk-students")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void bulkStudentImportRejectsMoreThanFiveHundredRows() throws Exception {
        BulkStudentImportRequest request = new BulkStudentImportRequest(
            IntStream.rangeClosed(1, 501)
                .mapToObj(row -> new BulkStudentImportEntry(row, "student" + row + "@campus.test"))
                .toList()
        );

        mockMvc.perform(post("/api/admin/users/bulk-students/preview")
                .with(jwtFor("admin@campus.test"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("Student imports are limited to 500 rows per request."));
    }

    @Test
    void adminCanListAuditLogs() throws Exception {
        CreateUserRequest request = new CreateUserRequest(
            "audit-log-student@campus.test",
            UserType.STUDENT,
            false,
            null,
            null,
            null,
            null,
            null
        );

        mockMvc.perform(post("/api/admin/users")
                .with(jwtFor("admin@campus.test"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated());

        mockMvc.perform(get("/api/admin/audit-logs")
                .with(jwtFor("admin@campus.test"))
                .param("action", "USER_CREATED")
                .param("size", "5"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[0].action").value("USER_CREATED"))
            .andExpect(jsonPath("$.items[0].performedByEmail").value("admin@campus.test"))
            .andExpect(jsonPath("$.items[0].targetUserEmail").value("audit-log-student@campus.test"));
    }

    @Test
    void adminCanListAuditLogsForSpecificUser() throws Exception {
        CreateUserRequest request = new CreateUserRequest(
            "audit-user@campus.test",
            UserType.STUDENT,
            false,
            null,
            null,
            null,
            null,
            null
        );

        mockMvc.perform(post("/api/admin/users")
                .with(jwtFor("admin@campus.test"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated());

        UserEntity created = userRepository.findByEmailIgnoreCase("audit-user@campus.test").orElseThrow();

        mockMvc.perform(get("/api/admin/audit-logs/user/{id}", created.getId())
                .with(jwtFor("admin@campus.test"))
                .param("size", "5"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[0].targetUserId").value(created.getId().toString()));
    }

    @Test
    void nonAdminCannotAccessAuditLogs() throws Exception {
        seedStudent("student.no.audit@campus.test", AccountStatus.ACTIVE, true);

        mockMvc.perform(get("/api/admin/audit-logs")
                .with(jwtFor("student.no.audit@campus.test")))
            .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/admin/audit-logs"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void unauthenticatedUserCannotAccessAdminUsersEndpoint() throws Exception {
        mockMvc.perform(get("/api/admin/users"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void currentAdminResponseUsesFullNameProfileShape() throws Exception {
        mockMvc.perform(get("/api/auth/me")
                .with(jwtFor("admin@campus.test")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.adminProfile.fullName").value("Admin User"))
            .andExpect(jsonPath("$.adminProfile.firstName").doesNotExist());
    }

    @Test
    void studentCannotAccessAdminUsersEndpoint() throws Exception {
        seedStudent("student.no.admin@campus.test", AccountStatus.ACTIVE, true);

        mockMvc.perform(get("/api/admin/users")
                .with(jwtFor("student.no.admin@campus.test")))
            .andExpect(status().isForbidden());
    }

    @Test
    void unauthenticatedUserCannotAccessStudentOnboardingEndpoint() throws Exception {
        mockMvc.perform(get("/api/students/me/onboarding"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void adminCannotAccessStudentOnboardingEndpoint() throws Exception {
        mockMvc.perform(get("/api/students/me/onboarding")
                .with(jwtFor("admin@campus.test")))
            .andExpect(status().isForbidden());
    }

    @Test
    void rejectsManagerCreationWithoutManagerRole() throws Exception {
        CreateUserRequest request = new CreateUserRequest(
            "manager-no-roles@campus.test",
            UserType.MANAGER,
            false,
            null,
            null,
            null,
            null,
            null
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
    void activeUnboundSessionSyncIsRejectedUntilProvisionedIdentityLinked() throws Exception {
        seedFaculty("active.unbound@campus.test", AccountStatus.ACTIVE);

        mockMvc.perform(post("/api/auth/session/sync")
                .with(jwtFor("active.unbound@campus.test")))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("This authenticated account must be invited before first sign-in."));
    }

    @Test
    void invitedUnboundSessionSyncRejectsExplicitUnverifiedEmailClaim() throws Exception {
        seedStudent("invite.unverified@campus.test", AccountStatus.INVITED, false);

        mockMvc.perform(post("/api/auth/session/sync")
                .with(jwt().jwt(jwt -> jwt
                    .subject(UUID.randomUUID().toString())
                    .claim("email", "invite.unverified@campus.test")
                    .claim("email_verified", false))))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Verified email is required to activate an invited account."));
    }

    @Test
    void invitedUnboundSessionSyncAcceptsExplicitVerifiedEmailClaim() throws Exception {
        seedStudent("invite.verified@campus.test", AccountStatus.INVITED, false);

        mockMvc.perform(post("/api/auth/session/sync")
                .with(jwt().jwt(jwt -> jwt
                    .subject(UUID.randomUUID().toString())
                    .claim("email", "invite.verified@campus.test")
                    .claim("email_verified", true))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.nextStep").value("ONBOARDING"))
            .andExpect(jsonPath("$.user.authUserId").isNotEmpty());
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
    void adminCanReplaceManagerRole() throws Exception {
        UserEntity manager = seedManager("manager@campus.test", ManagerRole.CATALOG_MANAGER);

        mockMvc.perform(put("/api/admin/users/{id}/manager-role", manager.getId())
                .with(jwtFor("admin@campus.test"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new ManagerRoleUpdateRequest(ManagerRole.TICKET_MANAGER))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.managerRole").value("TICKET_MANAGER"));
    }

    @Test
    void adminCanUpdateStudentProfile() throws Exception {
        UserEntity student = seedStudent("student.edit@campus.test", AccountStatus.INVITED, false);

        mockMvc.perform(patch("/api/admin/users/{id}", student.getId())
                .with(jwtFor("admin@campus.test"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "studentProfile": {
                        "firstName": "Updated",
                        "lastName": "Student",
                        "preferredName": "US",
                        "phoneNumber": "0711111111",
                        "facultyName": "FACULTY_OF_COMPUTING",
                        "programName": "BSC_HONS_INFORMATION_TECHNOLOGY",
                        "academicYear": "YEAR_2",
                                                "semester": "SEMESTER_1"
                      }
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.studentProfile.firstName").value("Updated"))
            .andExpect(jsonPath("$.studentProfile.registrationNumber").value(org.hamcrest.Matchers.matchesPattern(
                "IT" + String.format("%02d", Math.floorMod(Year.now(ZoneOffset.UTC).getValue() - 1, 100)) + "\\d{6}")))
            .andExpect(jsonPath("$.studentProfile.programName").value("BSC_HONS_INFORMATION_TECHNOLOGY"));
    }

    @Test
    void adminStudentProfileUpdateRejectsProgramFromAnotherFaculty() throws Exception {
        UserEntity student = seedStudent("student.invalid@campus.test", AccountStatus.INVITED, false);

        mockMvc.perform(patch("/api/admin/users/{id}", student.getId())
                .with(jwtFor("admin@campus.test"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "studentProfile": {
                        "firstName": "Invalid",
                        "lastName": "Student",
                        "phoneNumber": "0711111111",
                        "facultyName": "FACULTY_OF_ENGINEERING",
                        "programName": "BSC_HONS_INFORMATION_TECHNOLOGY",
                        "academicYear": "YEAR_2",
                        "semester": "SEMESTER_1"
                      }
                    }
                    """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("Program does not belong to the selected faculty."));
    }

    @Test
    void adminCanResendInviteAndPublicLoginLinkRequestIsSafe() throws Exception {
        UserEntity student = seedStudent("resend@campus.test", AccountStatus.INVITED, false);

        mockMvc.perform(post("/api/admin/users/{id}/invite", student.getId())
                .with(jwtFor("admin@campus.test")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value("Sign-in email sent."));

        mockMvc.perform(post("/api/auth/login-link/request")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"missing@campus.test\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value("If the account exists, a sign-in email has been sent."));
    }

    @Test
    void publicPasswordResetRequestUsesGenericResponseAndRateLimit() throws Exception {
        seedStudent("reset-existing@campus.test", AccountStatus.ACTIVE, true);
        seedStudent("reset-suspended@campus.test", AccountStatus.SUSPENDED, true);

        mockMvc.perform(post("/api/auth/password-reset/request")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"reset-existing@campus.test\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value("If the account exists, a password reset email has been sent."));

        int deliveriesAfterFirstRequest = recordingAuthProviderClient.deliveries().size();

        mockMvc.perform(post("/api/auth/password-reset/request")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"missing-reset@campus.test\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value("If the account exists, a password reset email has been sent."));

        mockMvc.perform(post("/api/auth/password-reset/request")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"reset-suspended@campus.test\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value("If the account exists, a password reset email has been sent."));

        mockMvc.perform(post("/api/auth/password-reset/request")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"reset-existing@campus.test\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value("If the account exists, a password reset email has been sent."));

        assertThat(recordingAuthProviderClient.deliveries()).hasSize(deliveriesAfterFirstRequest);
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
    void adminCanDeleteUserWithRequesterBookings() throws Exception {
        UserEntity student = seedStudent("delete.with.bookings@campus.test", AccountStatus.ACTIVE, true);
        UUID authUserId = UUID.randomUUID();
        student.setAuthUserId(authUserId);
        userRepository.saveAndFlush(student);

        ResourceEntity resource = seedResource("DEL-" + UUID.randomUUID());
        Instant startTime = Instant.now().plusSeconds(3600);

        BookingEntity booking = new BookingEntity();
        booking.setId(UUID.randomUUID());
        booking.setRequester(student);
        booking.setResource(resource);
        booking.setStartTime(startTime);
        booking.setEndTime(startTime.plusSeconds(3600));
        booking.setStatus(BookingStatus.PENDING);
        bookingRepository.saveAndFlush(booking);

        mockMvc.perform(delete("/api/admin/users/{id}", student.getId())
                .with(jwtFor("admin@campus.test")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value("User deleted."));

        assertThat(userRepository.findById(student.getId())).isEmpty();
        assertThat(bookingRepository.findById(booking.getId())).isEmpty();
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
                      "facultyName": "FACULTY_OF_COMPUTING",
                      "programName": "BSC_HONS_INFORMATION_TECHNOLOGY",
                      "academicYear": "YEAR_3",
                      "semester": "SEMESTER_2",
                                            "profileImageUrl": null
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accountStatus").value("ACTIVE"))
            .andExpect(jsonPath("$.studentProfile.onboardingCompleted").value(true))
            .andExpect(jsonPath("$.studentProfile.registrationNumber").value(org.hamcrest.Matchers.matchesPattern(
                "IT" + String.format("%02d", Math.floorMod(Year.now(ZoneOffset.UTC).getValue() - 2, 100)) + "\\d{6}")));
    }

    @Test
    void onboardingRejectsClientProvidedRegistrationNumber() throws Exception {
        seedStudent("onboarding-reject@campus.test", AccountStatus.INVITED, false);

        mockMvc.perform(put("/api/students/me/onboarding")
                .with(jwtFor("onboarding-reject@campus.test"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "firstName": "On",
                      "lastName": "Board",
                      "phoneNumber": "0777777777",
                      "registrationNumber": "IT26000001",
                      "facultyName": "FACULTY_OF_COMPUTING",
                      "programName": "BSC_HONS_INFORMATION_TECHNOLOGY",
                      "academicYear": "YEAR_3",
                      "semester": "SEMESTER_2"
                    }
                    """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("auto-generated")));
    }

    @Test
    void adminCreateRejectsClientProvidedEmployeeNumber() throws Exception {
        CreateUserRequest request = new CreateUserRequest(
            "faculty-with-employee@campus.test",
            UserType.FACULTY,
            true,
            null,
            new AdminDtos.FacultyProfileInput(
                "Fac",
                "Member",
                null,
                "0711111111",
                "FAC26000001",
                "Computing",
                "Lecturer"
            ),
            null,
            null,
            null
        );

        mockMvc.perform(post("/api/admin/users")
                .with(jwtFor("admin@campus.test"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("auto-generated")));
    }

    @Test
    void studentCanUploadProfileImage() throws Exception {
        seedStudent("image.student@campus.test", AccountStatus.INVITED, false);
        MockMultipartFile file = new MockMultipartFile(
            "file",
            "avatar.png",
            "image/png",
            new byte[] { 1, 2, 3, 4 }
        );

        mockMvc.perform(multipart("/api/students/me/profile-image")
                .file(file)
                .with(jwtFor("image.student@campus.test")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.studentProfile.profileImageUrl").value(org.hamcrest.Matchers.startsWith("https://storage.test/")));

        assertThat(recordingProfileImageStorageClient.storedImages()).hasSize(1);
    }

    @Test
    void profileImageUploadRejectsInvalidMimeType() throws Exception {
        seedStudent("bad-image.student@campus.test", AccountStatus.INVITED, false);
        MockMultipartFile file = new MockMultipartFile(
            "file",
            "avatar.txt",
            "text/plain",
            new byte[] { 1, 2, 3, 4 }
        );

        mockMvc.perform(multipart("/api/students/me/profile-image")
                .file(file)
                .with(jwtFor("bad-image.student@campus.test")))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("Profile image must be a JPEG, PNG, or WebP file."));
    }

    @Test
    void profileImageUploadRejectsOversizedFile() throws Exception {
        seedStudent("large-image.student@campus.test", AccountStatus.INVITED, false);
        MockMultipartFile file = new MockMultipartFile(
            "file",
            "avatar.png",
            "image/png",
            new byte[(2 * 1024 * 1024) + 1]
        );

        mockMvc.perform(multipart("/api/students/me/profile-image")
                .file(file)
                .with(jwtFor("large-image.student@campus.test")))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("Profile image must be 2 MB or smaller."));
    }

    @Test
    void profileImageUploadRejectsNonStudentAndUnauthenticatedUsers() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
            "file",
            "avatar.png",
            "image/png",
            new byte[] { 1, 2, 3, 4 }
        );

        mockMvc.perform(multipart("/api/students/me/profile-image")
                .file(file)
                .with(jwtFor("admin@campus.test")))
            .andExpect(status().isForbidden());

        mockMvc.perform(multipart("/api/students/me/profile-image").file(file))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void studentOnboardingRequiresSemester() throws Exception {
        seedStudent("missing-semester@campus.test", AccountStatus.INVITED, false);

        mockMvc.perform(put("/api/students/me/onboarding")
                .with(jwtFor("missing-semester@campus.test"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "firstName": "On",
                      "lastName": "Board",
                      "phoneNumber": "0777777777",
                      "facultyName": "FACULTY_OF_COMPUTING",
                      "programName": "BSC_HONS_INFORMATION_TECHNOLOGY",
                      "academicYear": "YEAR_1"
                    }
                    """))
            .andExpect(status().isBadRequest());
    }

    private void seedAdmin(String email) {
        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());
        user.setAuthUserId(authUserIdFor(email));
        user.setEmail(email);
        user.setUserType(UserType.ADMIN);
        user.setAccountStatus(AccountStatus.ACTIVE);
        user.setInvitedAt(Instant.now());
        user.setActivatedAt(Instant.now());

        AdminEntity admin = new AdminEntity();
        admin.setUser(user);
        admin.setFullName("Admin User");
        admin.setEmployeeNumber("ADM-" + UUID.randomUUID().toString().substring(0, 8));
        user.setAdminProfile(admin);

        userRepository.save(user);
    }

    private UserEntity seedStudent(String email, AccountStatus status, boolean onboardingCompleted) {
        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());
        if (status == AccountStatus.ACTIVE || status == AccountStatus.SUSPENDED) {
            user.setAuthUserId(authUserIdFor(email));
        }
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
        faculty.setEmployeeNumber("FAC-" + UUID.randomUUID().toString().substring(0, 8));
        faculty.setDepartment("Computing");
        faculty.setDesignation("Lecturer");
        user.setFacultyProfile(faculty);

        userRepository.save(user);
    }

    private UserEntity seedManager(String email, ManagerRole role) {
        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());
        user.setAuthUserId(authUserIdFor(email));
        user.setEmail(email);
        user.setUserType(UserType.MANAGER);
        user.setAccountStatus(AccountStatus.ACTIVE);
        user.setInvitedAt(Instant.now());
        user.setActivatedAt(Instant.now());

        ManagerEntity manager = new ManagerEntity();
        manager.setUser(user);
        manager.setFirstName("Manager");
        manager.setLastName("User");
        manager.setEmployeeNumber("MGR-" + UUID.randomUUID().toString().substring(0, 8));
        manager.setManagerRole(role);

        user.setManagerProfile(manager);
        return userRepository.save(user);
    }

    private ResourceEntity seedResource(String code) {
        ResourceEntity resource = new ResourceEntity();
        resource.setId(UUID.randomUUID());
        resource.setCode(code);
        resource.setName("Delete Test Resource");
        resource.setCategory(ResourceCategory.SPACES);
        resource.setSubcategory("Seeded");
        resource.setDescription("Resource used by delete-user tests");
        resource.setLocation("Test Wing");
        resource.setCapacity(10);
        resource.setQuantity(1);
        resource.setStatus(ResourceStatus.ACTIVE);
        resource.setBookable(true);
        resource.setMovable(false);
        return resourceRepository.save(resource);
    }
}
