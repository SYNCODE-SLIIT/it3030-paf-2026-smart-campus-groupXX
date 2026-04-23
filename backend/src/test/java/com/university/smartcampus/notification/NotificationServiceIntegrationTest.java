package com.university.smartcampus.notification;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Consumer;
import java.util.stream.Collectors;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import com.university.smartcampus.AbstractPostgresIntegrationTest;
import com.university.smartcampus.common.enums.AppEnums.AccountStatus;
import com.university.smartcampus.common.enums.AppEnums.TicketCategory;
import com.university.smartcampus.common.enums.AppEnums.TicketPriority;
import com.university.smartcampus.common.enums.AppEnums.TicketStatus;
import com.university.smartcampus.common.enums.AppEnums.UserType;
import com.university.smartcampus.notification.NotificationDtos.NotificationPreferenceCategoryResponse;
import com.university.smartcampus.notification.NotificationDtos.NotificationPreferencesResponse;
import com.university.smartcampus.notification.NotificationDtos.UpdateNotificationPreferenceCategoryRequest;
import com.university.smartcampus.notification.NotificationDtos.UpdateNotificationPreferencesRequest;
import com.university.smartcampus.notification.NotificationEnums.NotificationDeliveryChannel;
import com.university.smartcampus.notification.NotificationEnums.NotificationDeliveryStatus;
import com.university.smartcampus.notification.NotificationEnums.NotificationDomain;
import com.university.smartcampus.ticket.entity.TicketEntity;
import com.university.smartcampus.ticket.repository.TicketRepository;
import com.university.smartcampus.user.entity.AdminEntity;
import com.university.smartcampus.user.entity.StudentEntity;
import com.university.smartcampus.user.entity.UserEntity;
import com.university.smartcampus.user.repository.UserRepository;

@SpringBootTest(properties = "app.notifications.email.enabled=true")
@Transactional
class NotificationServiceIntegrationTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private NotificationPreferenceRepository preferenceRepository;

    @Autowired
    private NotificationRecipientRepository recipientRepository;

    @Autowired
    private NotificationDeliveryAttemptRepository deliveryAttemptRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TicketRepository ticketRepository;

    @Test
    void getPreferencesReturnsAllDomainsAndCreatesMissingRows() {
        UserEntity student = seedActiveStudent("preferences.student@campus.test");

        NotificationPreferencesResponse response = notificationService.getPreferences(student);

        assertThat(response.categories())
            .extracting(NotificationPreferenceCategoryResponse::domain)
            .containsExactly(NotificationDomain.TICKET, NotificationDomain.BOOKING, NotificationDomain.CATALOG, NotificationDomain.SYSTEM);
        assertThat(preferenceRepository.findByUserId(student.getId())).hasSize(4);
    }

    @Test
    void updatePreferencesReplacesSavedCategoryStates() {
        UserEntity student = seedActiveStudent("preferences.replace@campus.test");

        NotificationPreferencesResponse response = notificationService.updatePreferences(
            student,
            new UpdateNotificationPreferencesRequest(List.of(
                new UpdateNotificationPreferenceCategoryRequest(NotificationDomain.TICKET, false, false),
                new UpdateNotificationPreferenceCategoryRequest(NotificationDomain.BOOKING, true, false),
                new UpdateNotificationPreferenceCategoryRequest(NotificationDomain.CATALOG, false, true),
                new UpdateNotificationPreferenceCategoryRequest(NotificationDomain.SYSTEM, true, true)
            ))
        );

        Map<NotificationDomain, NotificationPreferenceCategoryResponse> categoriesByDomain = response.categories().stream()
            .collect(Collectors.toMap(NotificationPreferenceCategoryResponse::domain, category -> category));

        assertThat(categoriesByDomain.get(NotificationDomain.TICKET).inAppEnabled()).isFalse();
        assertThat(categoriesByDomain.get(NotificationDomain.TICKET).emailEnabled()).isFalse();
        assertThat(categoriesByDomain.get(NotificationDomain.BOOKING).inAppEnabled()).isTrue();
        assertThat(categoriesByDomain.get(NotificationDomain.BOOKING).emailEnabled()).isFalse();
        assertThat(categoriesByDomain.get(NotificationDomain.CATALOG).inAppEnabled()).isFalse();
        assertThat(categoriesByDomain.get(NotificationDomain.CATALOG).emailEnabled()).isTrue();
        assertThat(categoriesByDomain.get(NotificationDomain.SYSTEM).inAppEnabled()).isTrue();
        assertThat(categoriesByDomain.get(NotificationDomain.SYSTEM).emailEnabled()).isTrue();

        Map<NotificationDomain, NotificationPreferenceEntity> persistedByDomain = preferenceRepository.findByUserId(student.getId()).stream()
            .collect(Collectors.toMap(NotificationPreferenceEntity::getDomain, preference -> preference));

        assertThat(persistedByDomain.get(NotificationDomain.TICKET).isInAppEnabled()).isFalse();
        assertThat(persistedByDomain.get(NotificationDomain.TICKET).isEmailEnabled()).isFalse();
        assertThat(persistedByDomain.get(NotificationDomain.BOOKING).isEmailEnabled()).isFalse();
        assertThat(persistedByDomain.get(NotificationDomain.CATALOG).isInAppEnabled()).isFalse();
    }

    @Test
    void disabledInAppPreferenceSkipsInAppDeliveryAndHidesNotification() {
        UserEntity admin = seedAdmin("notification.admin@campus.test");
        UserEntity student = seedActiveStudent("notification.hidden@campus.test");

        updatePreferences(student, categories -> categories.put(
            NotificationDomain.TICKET,
            new UpdateNotificationPreferenceCategoryRequest(NotificationDomain.TICKET, false, true)
        ));

        notificationService.notifyTicketAssigned(ticketAssignedTo(student), null, student, admin);

        NotificationRecipientEntity recipient = recipientRepository.findAll().stream().findFirst().orElseThrow();
        NotificationDeliveryAttemptEntity inAppAttempt = deliveryAttemptRepository
            .findFirstByRecipientIdAndChannel(recipient.getId(), NotificationDeliveryChannel.IN_APP)
            .orElseThrow();
        NotificationDeliveryAttemptEntity emailAttempt = deliveryAttemptRepository
            .findFirstByRecipientIdAndChannel(recipient.getId(), NotificationDeliveryChannel.EMAIL)
            .orElseThrow();

        assertThat(inAppAttempt.getStatus()).isEqualTo(NotificationDeliveryStatus.SKIPPED);
        assertThat(emailAttempt.getStatus()).isEqualTo(NotificationDeliveryStatus.PENDING);
        assertThat(notificationService.listNotifications(student, "all", null, 20)).isEmpty();
        assertThat(notificationService.unreadCount(student).unreadCount()).isZero();

        notificationService.markAllAsRead(student);

        assertThat(notificationService.unreadCount(student).unreadCount()).isZero();
        assertThat(recipientRepository.findById(recipient.getId()).orElseThrow().getReadAt()).isNull();
    }

    @Test
    void disabledEmailPreferenceSkipsEmailAndKeepsInAppVisible() {
        UserEntity admin = seedAdmin("notification.email.admin@campus.test");
        UserEntity student = seedActiveStudent("notification.visible@campus.test");

        updatePreferences(student, categories -> categories.put(
            NotificationDomain.TICKET,
            new UpdateNotificationPreferenceCategoryRequest(NotificationDomain.TICKET, true, false)
        ));

        notificationService.notifyTicketAssigned(ticketAssignedTo(student), null, student, admin);

        NotificationRecipientEntity recipient = recipientRepository.findAll().stream().findFirst().orElseThrow();
        NotificationDeliveryAttemptEntity inAppAttempt = deliveryAttemptRepository
            .findFirstByRecipientIdAndChannel(recipient.getId(), NotificationDeliveryChannel.IN_APP)
            .orElseThrow();
        NotificationDeliveryAttemptEntity emailAttempt = deliveryAttemptRepository
            .findFirstByRecipientIdAndChannel(recipient.getId(), NotificationDeliveryChannel.EMAIL)
            .orElseThrow();

        assertThat(inAppAttempt.getStatus()).isEqualTo(NotificationDeliveryStatus.SENT);
        assertThat(emailAttempt.getStatus()).isEqualTo(NotificationDeliveryStatus.SKIPPED);
        assertThat(notificationService.listNotifications(student, "all", null, 20)).hasSize(1);
        assertThat(notificationService.unreadCount(student).unreadCount()).isEqualTo(1);

        assertThat(notificationService.markAllAsRead(student).unreadCount()).isZero();
        assertThat(recipientRepository.findById(recipient.getId()).orElseThrow().getReadAt()).isNotNull();
    }

    private void updatePreferences(
        UserEntity user,
        Consumer<Map<NotificationDomain, UpdateNotificationPreferenceCategoryRequest>> mutator
    ) {
        Map<NotificationDomain, UpdateNotificationPreferenceCategoryRequest> categories = allCategories(true, true).stream()
            .collect(Collectors.toMap(UpdateNotificationPreferenceCategoryRequest::domain, category -> category));
        mutator.accept(categories);
        notificationService.updatePreferences(user, new UpdateNotificationPreferencesRequest(List.copyOf(categories.values())));
    }

    private List<UpdateNotificationPreferenceCategoryRequest> allCategories(boolean inAppEnabled, boolean emailEnabled) {
        return List.of(
            new UpdateNotificationPreferenceCategoryRequest(NotificationDomain.TICKET, inAppEnabled, emailEnabled),
            new UpdateNotificationPreferenceCategoryRequest(NotificationDomain.BOOKING, inAppEnabled, emailEnabled),
            new UpdateNotificationPreferenceCategoryRequest(NotificationDomain.CATALOG, inAppEnabled, emailEnabled),
            new UpdateNotificationPreferenceCategoryRequest(NotificationDomain.SYSTEM, inAppEnabled, emailEnabled)
        );
    }

    private TicketEntity ticketAssignedTo(UserEntity assignee) {
        TicketEntity ticket = new TicketEntity();
        ticket.setId(UUID.randomUUID());
        ticket.setTicketCode("TCK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        ticket.setTitle("Notification preference test");
        ticket.setDescription("Notification preference test description");
        ticket.setCategory(TicketCategory.OTHER);
        ticket.setPriority(TicketPriority.LOW);
        ticket.setStatus(TicketStatus.OPEN);
        ticket.setAssignedTo(assignee);
        ticket.setReportedBy(assignee);
        return ticketRepository.saveAndFlush(ticket);
    }

    private UserEntity seedAdmin(String email) {
        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());
        user.setEmail(email);
        user.setUserType(UserType.ADMIN);
        user.setAccountStatus(AccountStatus.ACTIVE);
        user.setInvitedAt(Instant.now());
        user.setActivatedAt(Instant.now());

        AdminEntity admin = new AdminEntity();
        admin.setUser(user);
        admin.setFullName("Admin User");
        admin.setEmployeeNumber("ADM-001");
        user.setAdminProfile(admin);

        return userRepository.saveAndFlush(user);
    }

    private UserEntity seedActiveStudent(String email) {
        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());
        user.setEmail(email);
        user.setUserType(UserType.STUDENT);
        user.setAccountStatus(AccountStatus.ACTIVE);
        user.setInvitedAt(Instant.now());
        user.setActivatedAt(Instant.now());

        StudentEntity student = new StudentEntity();
        student.setUser(user);
        student.setOnboardingCompleted(true);
        user.setStudentProfile(student);

        return userRepository.saveAndFlush(user);
    }
}
