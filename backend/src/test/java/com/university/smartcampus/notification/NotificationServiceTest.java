package com.university.smartcampus.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.university.smartcampus.booking.BookingRepository;
import com.university.smartcampus.common.enums.AppEnums.AccountStatus;
import com.university.smartcampus.common.enums.AppEnums.TicketPriority;
import com.university.smartcampus.common.enums.AppEnums.UserType;
import com.university.smartcampus.common.exception.NotFoundException;
import com.university.smartcampus.config.SmartCampusProperties;
import com.university.smartcampus.notification.NotificationEnums.NotificationDeliveryChannel;
import com.university.smartcampus.notification.NotificationEnums.NotificationDeliveryStatus;
import com.university.smartcampus.notification.NotificationEnums.NotificationDomain;
import com.university.smartcampus.notification.NotificationEnums.NotificationSeverity;
import com.university.smartcampus.ticket.entity.TicketEntity;
import com.university.smartcampus.user.entity.UserEntity;
import com.university.smartcampus.user.repository.ManagerRepository;
import com.university.smartcampus.user.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationEventRepository eventRepository;

    @Mock
    private NotificationRecipientRepository recipientRepository;

    @Mock
    private NotificationEventLinkRepository linkRepository;

    @Mock
    private NotificationPreferenceRepository preferenceRepository;

    @Mock
    private NotificationDeliveryAttemptRepository deliveryAttemptRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ManagerRepository managerRepository;

    @Mock
    private BookingRepository bookingRepository;

    private SmartCampusProperties properties;
    private NotificationService notificationService;

    @BeforeEach
    void setUp() {
        properties = new SmartCampusProperties();
        properties.getNotifications().getEmail().setEnabled(true);
        notificationService = new NotificationService(
            eventRepository,
            recipientRepository,
            linkRepository,
            preferenceRepository,
            deliveryAttemptRepository,
            userRepository,
            managerRepository,
            bookingRepository,
            properties
        );
    }

    @Test
    void notifyTicketCreatedCreatesAdminRecipientAndDeliveryAttempts() {
        UserEntity reporter = user(UUID.randomUUID(), UserType.STUDENT, "student@campus.test");
        UserEntity admin = user(UUID.randomUUID(), UserType.ADMIN, "admin@campus.test");
        TicketEntity ticket = new TicketEntity();
        ticket.setId(UUID.randomUUID());
        ticket.setTicketCode("TCK-1001");
        ticket.setTitle("Broken projector");
        ticket.setPriority(TicketPriority.HIGH);
        ticket.setReportedBy(reporter);

        NotificationPreferenceEntity preference = new NotificationPreferenceEntity();
        preference.setUser(admin);
        preference.setInAppEnabled(true);
        preference.setEmailEnabled(true);

        when(userRepository.findByUserTypeAndAccountStatus(UserType.ADMIN, AccountStatus.ACTIVE))
            .thenReturn(List.of(admin));
        when(eventRepository.findByDedupeKey("ticket-created:" + ticket.getId())).thenReturn(Optional.empty());
        when(eventRepository.save(any(NotificationEventEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(linkRepository.save(any(NotificationEventLinkEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(recipientRepository.save(any(NotificationRecipientEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(preferenceRepository.findByUserId(admin.getId())).thenReturn(Optional.of(preference));
        when(deliveryAttemptRepository.save(any(NotificationDeliveryAttemptEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        notificationService.notifyTicketCreated(ticket);

        ArgumentCaptor<NotificationEventEntity> eventCaptor = ArgumentCaptor.forClass(NotificationEventEntity.class);
        verify(eventRepository).save(eventCaptor.capture());
        NotificationEventEntity event = eventCaptor.getValue();
        assertThat(event.getDomain()).isEqualTo(NotificationDomain.TICKET);
        assertThat(event.getType()).isEqualTo("TICKET_CREATED");
        assertThat(event.getSeverity()).isEqualTo(NotificationSeverity.ACTION_REQUIRED);
        assertThat(event.getActorUser()).isEqualTo(reporter);

        ArgumentCaptor<NotificationRecipientEntity> recipientCaptor = ArgumentCaptor.forClass(NotificationRecipientEntity.class);
        verify(recipientRepository).save(recipientCaptor.capture());
        assertThat(recipientCaptor.getValue().getRecipientUser()).isEqualTo(admin);
        assertThat(recipientCaptor.getValue().getActionUrl()).isEqualTo("/admin/tickets/TCK-1001");

        ArgumentCaptor<NotificationDeliveryAttemptEntity> deliveryCaptor =
            ArgumentCaptor.forClass(NotificationDeliveryAttemptEntity.class);
        verify(deliveryAttemptRepository, org.mockito.Mockito.times(2)).save(deliveryCaptor.capture());
        assertThat(deliveryCaptor.getAllValues())
            .extracting(NotificationDeliveryAttemptEntity::getChannel)
            .containsExactly(NotificationDeliveryChannel.IN_APP, NotificationDeliveryChannel.EMAIL);
        assertThat(deliveryCaptor.getAllValues())
            .extracting(NotificationDeliveryAttemptEntity::getStatus)
            .containsExactly(NotificationDeliveryStatus.SENT, NotificationDeliveryStatus.PENDING);
    }

    @Test
    void notifyTicketCreatedSkipsDuplicateDedupeKey() {
        UserEntity admin = user(UUID.randomUUID(), UserType.ADMIN, "admin@campus.test");
        TicketEntity ticket = new TicketEntity();
        ticket.setId(UUID.randomUUID());
        ticket.setTicketCode("TCK-1002");
        ticket.setTitle("Wi-Fi issue");
        ticket.setPriority(TicketPriority.MEDIUM);

        when(userRepository.findByUserTypeAndAccountStatus(UserType.ADMIN, AccountStatus.ACTIVE))
            .thenReturn(List.of(admin));
        when(eventRepository.findByDedupeKey("ticket-created:" + ticket.getId()))
            .thenReturn(Optional.of(new NotificationEventEntity()));

        notificationService.notifyTicketCreated(ticket);

        verify(eventRepository, never()).save(any(NotificationEventEntity.class));
        verify(recipientRepository, never()).save(any(NotificationRecipientEntity.class));
        verify(deliveryAttemptRepository, never()).save(any(NotificationDeliveryAttemptEntity.class));
    }

    @Test
    void markAsReadRequiresNotificationOwnership() {
        UserEntity user = user(UUID.randomUUID(), UserType.STUDENT, "student@campus.test");
        UUID notificationId = UUID.randomUUID();
        when(recipientRepository.findByIdAndRecipientUserId(notificationId, user.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> notificationService.markAsRead(user, notificationId))
            .isInstanceOf(NotFoundException.class)
            .hasMessage("Notification not found.");
    }

    private UserEntity user(UUID id, UserType userType, String email) {
        UserEntity user = new UserEntity();
        user.setId(id);
        user.setUserType(userType);
        user.setEmail(email);
        user.setAccountStatus(AccountStatus.ACTIVE);
        return user;
    }
}
