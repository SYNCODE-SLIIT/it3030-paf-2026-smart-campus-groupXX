package com.university.smartcampus;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.time.Year;
import java.time.ZoneOffset;
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
import com.university.smartcampus.common.enums.AppEnums.AdminAction;
import com.university.smartcampus.common.enums.AppEnums.AuthDeliveryMethod;
import com.university.smartcampus.common.enums.AppEnums.ManagerRole;
import com.university.smartcampus.common.enums.AppEnums.Semester;
import com.university.smartcampus.common.enums.AppEnums.StudentFaculty;
import com.university.smartcampus.common.enums.AppEnums.StudentProgram;
import com.university.smartcampus.common.enums.AppEnums.TicketCategory;
import com.university.smartcampus.common.enums.AppEnums.TicketPriority;
import com.university.smartcampus.common.enums.AppEnums.TicketStatus;
import com.university.smartcampus.common.enums.AppEnums.UserType;
import com.university.smartcampus.common.exception.BadRequestException;
import com.university.smartcampus.ticket.entity.TicketEntity;
import com.university.smartcampus.ticket.repository.TicketRepository;
import com.university.smartcampus.user.dto.AdminDtos.CreateUserRequest;
import com.university.smartcampus.user.dto.AdminDtos.UpdateUserRequest;
import com.university.smartcampus.user.dto.StudentDtos.StudentOnboardingRequest;
import com.university.smartcampus.user.entity.AdminEntity;
import com.university.smartcampus.user.entity.ManagerEntity;
import com.university.smartcampus.user.entity.StudentEntity;
import com.university.smartcampus.user.entity.UserEntity;
import com.university.smartcampus.user.repository.AuditLogRepository;
import com.university.smartcampus.user.repository.UserRepository;
import com.university.smartcampus.user.service.UserManagementService;

import jakarta.persistence.EntityManager;

@SpringBootTest
@Import(TestAuthProviderConfiguration.class)
@Transactional
class UserManagementServiceTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private UserManagementService userManagementService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TicketRepository ticketRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private EntityManager entityManager;

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
    void createUserWithAdminActorWritesAuditLog() {
        UserEntity admin = seedAdmin("admin.audit@campus.test");

        CreateUserRequest request = new CreateUserRequest(
            "audited-manager@campus.test",
            UserType.MANAGER,
            true,
            null,
            null,
            null,
            null,
            ManagerRole.CATALOG_MANAGER
        );

        UserResponse response = userManagementService.createUser(request, admin);

        var entries = auditLogRepository.findByTargetUserIdOrderByCreatedAtDesc(response.id());
        assertThat(entries).hasSize(1);
        assertThat(entries.get(0).getAction()).isEqualTo(AdminAction.USER_CREATED);
        assertThat(entries.get(0).getPerformedById()).isEqualTo(admin.getId());
        assertThat(entries.get(0).getTargetUserEmail()).isEqualTo("audited-manager@campus.test");
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
                null,
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
        String expectedPrefix = "IT" + String.format("%02d", Math.floorMod(Year.now(ZoneOffset.UTC).getValue() - 1, 100));
        assertThat(response.studentProfile().registrationNumber()).matches(expectedPrefix + "\\d{6}");

        UserEntity persisted = userRepository.findById(studentUser.getId()).orElseThrow();
        assertThat(persisted.isOnboardingCompleted()).isTrue();
        assertThat(persisted.getAccountStatus()).isEqualTo(AccountStatus.ACTIVE);
        assertThat(persisted.getStudentProfile().isOnboardingCompleted()).isTrue();
        assertThat(persisted.getStudentProfile().getRegistrationNumber()).matches(expectedPrefix + "\\d{6}");
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
                null,
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
    void updateUserWithStatusChangeWritesUpdateAndSuspendAuditLogs() {
        UserEntity admin = seedAdmin("admin-status@campus.test");
        UserEntity studentUser = seedStudent("student-status@campus.test");

        userManagementService.updateUser(
            studentUser.getId(),
            new UpdateUserRequest(AccountStatus.SUSPENDED, null, null, null, null),
            admin
        );

        var entries = auditLogRepository.findByTargetUserIdOrderByCreatedAtDesc(studentUser.getId());
        assertThat(entries).extracting(entry -> entry.getAction())
            .contains(AdminAction.USER_UPDATED, AdminAction.USER_SUSPENDED);
    }

    @Test
    void resendInviteWithAdminActorWritesAuditLog() {
        UserEntity admin = seedAdmin("admin-invite@campus.test");
        UserEntity studentUser = seedStudent("invite-student@campus.test");

        userManagementService.resendInvite(studentUser.getId(), admin);

        var entries = auditLogRepository.findByTargetUserIdOrderByCreatedAtDesc(studentUser.getId());
        assertThat(entries).hasSize(1);
        assertThat(entries.get(0).getAction()).isEqualTo(AdminAction.INVITE_RESENT);
    }

    @Test
    void resendInviteForInvitedStudentSendsInviteLink() {
        UserEntity studentUser = seedStudent("invited-student-link@campus.test");

        userManagementService.resendInvite(studentUser.getId());

        assertThat(recordingAuthProviderClient.deliveries()).hasSize(1);
        assertThat(recordingAuthProviderClient.deliveries().get(0).deliveryMethod())
            .isEqualTo(AuthDeliveryMethod.INVITE_EMAIL);
    }

    @Test
    void resendInviteForActiveStudentSendsRecoveryLink() {
        UserEntity studentUser = seedStudent("active-student-link@campus.test");
        studentUser.setAccountStatus(AccountStatus.ACTIVE);
        studentUser.setActivatedAt(Instant.now());
        userRepository.saveAndFlush(studentUser);

        userManagementService.resendInvite(studentUser.getId());

        assertThat(recordingAuthProviderClient.deliveries()).hasSize(1);
        assertThat(recordingAuthProviderClient.deliveries().get(0).deliveryMethod())
            .isEqualTo(AuthDeliveryMethod.PASSWORD_RECOVERY_EMAIL);
    }

    @Test
    void resendInviteForActiveManagerSendsRecoveryLink() {
        UserEntity manager = seedManager("active-manager-link@campus.test", ManagerRole.CATALOG_MANAGER);

        userManagementService.resendInvite(manager.getId());

        assertThat(recordingAuthProviderClient.deliveries()).hasSize(1);
        assertThat(recordingAuthProviderClient.deliveries().get(0).deliveryMethod())
            .isEqualTo(AuthDeliveryMethod.PASSWORD_RECOVERY_EMAIL);
    }

    @Test
    void passwordResetRequestUsesInviteForInvitedAndRecoveryForActiveUsers() {
        seedStudent("reset-invited@campus.test");
        UserEntity activeStudent = seedStudent("reset-active@campus.test");
        activeStudent.setAccountStatus(AccountStatus.ACTIVE);
        activeStudent.setActivatedAt(Instant.now());
        userRepository.saveAndFlush(activeStudent);

        assertThat(userManagementService.requestPasswordReset("reset-invited@campus.test").message())
            .isEqualTo("If the account exists, a password reset email has been sent.");
        assertThat(userManagementService.requestPasswordReset("reset-active@campus.test").message())
            .isEqualTo("If the account exists, a password reset email has been sent.");
        assertThat(userManagementService.requestPasswordReset("missing-reset@campus.test").message())
            .isEqualTo("If the account exists, a password reset email has been sent.");

        assertThat(recordingAuthProviderClient.deliveries()).hasSize(2);
        assertThat(recordingAuthProviderClient.deliveries().get(0).deliveryMethod())
            .isEqualTo(AuthDeliveryMethod.INVITE_EMAIL);
        assertThat(recordingAuthProviderClient.deliveries().get(1).deliveryMethod())
            .isEqualTo(AuthDeliveryMethod.PASSWORD_RECOVERY_EMAIL);
    }

    @Test
    void resendInviteForSuspendedUserIsBlocked() {
        UserEntity studentUser = seedStudent("suspended-student-link@campus.test");
        studentUser.setAccountStatus(AccountStatus.SUSPENDED);
        userRepository.saveAndFlush(studentUser);

        assertThatThrownBy(() -> userManagementService.resendInvite(studentUser.getId()))
            .isInstanceOf(BadRequestException.class)
            .hasMessage("Suspended users cannot receive login links.");
        assertThat(recordingAuthProviderClient.deliveries()).isEmpty();
    }

    @Test
    void replaceManagerRoleWithAdminActorWritesAuditLog() {
        UserEntity admin = seedAdmin("admin-manager@campus.test");
        UserEntity manager = seedManager("manager-role@campus.test", ManagerRole.CATALOG_MANAGER);

        userManagementService.replaceManagerRole(manager.getId(), ManagerRole.TICKET_MANAGER, admin);

        var entries = auditLogRepository.findByTargetUserIdOrderByCreatedAtDesc(manager.getId());
        assertThat(entries).hasSize(1);
        assertThat(entries.get(0).getAction()).isEqualTo(AdminAction.MANAGER_ROLE_CHANGED);
    }

    @Test
    void deleteUserWithAdminActorWritesAuditLog() {
        UserEntity admin = seedAdmin("admin-delete@campus.test");
        UserEntity studentUser = seedStudent("delete-audited@campus.test");

        userManagementService.deleteUser(studentUser.getId(), admin);

        var entries = auditLogRepository.findByPerformedByIdOrderByCreatedAtDesc(admin.getId());
        assertThat(entries).isNotEmpty();
        assertThat(entries.get(0).getAction()).isEqualTo(AdminAction.USER_DELETED);
        assertThat(entries.get(0).getTargetUserEmail()).isEqualTo("delete-audited@campus.test");
    }

    @Test
    void deleteUserCascadesReportedTickets() {
        UserEntity reporter = seedStudent("ticket-reporter@campus.test");
        reporter.setAuthUserId(UUID.randomUUID());
        userRepository.saveAndFlush(reporter);

        TicketEntity ticket = seedTicket(reporter, null);

        userManagementService.deleteUser(reporter.getId(), UUID.randomUUID());
        entityManager.clear();

        assertThat(ticketRepository.findById(ticket.getId())).isEmpty();
    }

    @Test
    void deleteUserClearsAssignedTicketsForOtherReporters() {
        UserEntity reporter = seedStudent("ticket-owner@campus.test");
        UserEntity assignee = seedStudent("ticket-assignee@campus.test");
        assignee.setAuthUserId(UUID.randomUUID());
        userRepository.saveAndFlush(assignee);

        TicketEntity ticket = seedTicket(reporter, assignee);

        userManagementService.deleteUser(assignee.getId(), UUID.randomUUID());
        entityManager.clear();

        TicketEntity persistedTicket = ticketRepository.findById(ticket.getId()).orElseThrow();
        assertThat(persistedTicket.getAssignedTo()).isNull();
        assertThat(persistedTicket.getReportedBy().getId()).isEqualTo(reporter.getId());
    }

    @Test
    void deleteUserRejectsSelfDelete() {
        UserEntity studentUser = seedStudent("self-delete@campus.test");

        assertThatThrownBy(() -> userManagementService.deleteUser(studentUser.getId(), studentUser.getId()))
            .isInstanceOf(BadRequestException.class)
            .hasMessage("You cannot delete your own admin account.");
    }

    private TicketEntity seedTicket(UserEntity reporter, UserEntity assignee) {
        TicketEntity ticket = new TicketEntity();
        ticket.setId(UUID.randomUUID());
        ticket.setTicketCode("TK" + UUID.randomUUID().toString().replace("-", "").substring(0, 10));
        ticket.setTitle("Delete test ticket");
        ticket.setDescription("Ensures ticket FK behavior when deleting users.");
        ticket.setCategory(TicketCategory.OTHER);
        ticket.setPriority(TicketPriority.LOW);
        ticket.setStatus(TicketStatus.OPEN);
        ticket.setReportedBy(reporter);
        ticket.setAssignedTo(assignee);

        return ticketRepository.saveAndFlush(ticket);
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

    private UserEntity seedAdmin(String email) {
        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());
        user.setEmail(email);
        user.setUserType(UserType.ADMIN);
        user.setAccountStatus(AccountStatus.ACTIVE);
        user.setInvitedAt(Instant.now());
        user.setActivatedAt(Instant.now());

        AdminEntity adminProfile = new AdminEntity();
        adminProfile.setUser(user);
        adminProfile.setFullName("Admin User");
        adminProfile.setEmployeeNumber("ADM-001");
        user.setAdminProfile(adminProfile);

        return userRepository.save(user);
    }

    private UserEntity seedManager(String email, ManagerRole managerRole) {
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
        manager.setManagerRole(managerRole);
        user.setManagerProfile(manager);

        return userRepository.save(user);
    }
}
