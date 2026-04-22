package com.university.smartcampus.notification;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.university.smartcampus.AppEnums.BookingStatus;
import com.university.smartcampus.AppEnums.ResourceStatus;
import com.university.smartcampus.booking.BookingEntity;
import com.university.smartcampus.booking.BookingModificationEntity;
import com.university.smartcampus.booking.BookingRepository;
import com.university.smartcampus.common.enums.AppEnums.AccountStatus;
import com.university.smartcampus.common.enums.AppEnums.ManagerRole;
import com.university.smartcampus.common.enums.AppEnums.TicketPriority;
import com.university.smartcampus.common.enums.AppEnums.TicketStatus;
import com.university.smartcampus.common.enums.AppEnums.UserType;
import com.university.smartcampus.common.exception.ForbiddenException;
import com.university.smartcampus.common.exception.NotFoundException;
import com.university.smartcampus.config.SmartCampusProperties;
import com.university.smartcampus.notification.NotificationDtos.NotificationDeliveryResponse;
import com.university.smartcampus.notification.NotificationDtos.NotificationLinkResponse;
import com.university.smartcampus.notification.NotificationDtos.NotificationPreferencesResponse;
import com.university.smartcampus.notification.NotificationDtos.NotificationResponse;
import com.university.smartcampus.notification.NotificationDtos.NotificationUnreadCountResponse;
import com.university.smartcampus.notification.NotificationDtos.UpdateNotificationPreferencesRequest;
import com.university.smartcampus.notification.NotificationEnums.NotificationDeliveryChannel;
import com.university.smartcampus.notification.NotificationEnums.NotificationDeliveryStatus;
import com.university.smartcampus.notification.NotificationEnums.NotificationDomain;
import com.university.smartcampus.notification.NotificationEnums.NotificationSeverity;
import com.university.smartcampus.resource.ResourceEntity;
import com.university.smartcampus.ticket.entity.TicketCommentEntity;
import com.university.smartcampus.ticket.entity.TicketEntity;
import com.university.smartcampus.user.entity.ManagerEntity;
import com.university.smartcampus.user.entity.UserEntity;
import com.university.smartcampus.user.repository.ManagerRepository;
import com.university.smartcampus.user.repository.UserRepository;

@Service
public class NotificationService {

    private static final int DEFAULT_LIMIT = 20;
    private static final int MAX_LIMIT = 100;
    private static final List<BookingStatus> FUTURE_BOOKING_STATUSES = List.of(BookingStatus.APPROVED);

    private final NotificationEventRepository eventRepository;
    private final NotificationRecipientRepository recipientRepository;
    private final NotificationEventLinkRepository linkRepository;
    private final NotificationPreferenceRepository preferenceRepository;
    private final NotificationDeliveryAttemptRepository deliveryAttemptRepository;
    private final UserRepository userRepository;
    private final ManagerRepository managerRepository;
    private final BookingRepository bookingRepository;
    private final SmartCampusProperties properties;

    public NotificationService(
        NotificationEventRepository eventRepository,
        NotificationRecipientRepository recipientRepository,
        NotificationEventLinkRepository linkRepository,
        NotificationPreferenceRepository preferenceRepository,
        NotificationDeliveryAttemptRepository deliveryAttemptRepository,
        UserRepository userRepository,
        ManagerRepository managerRepository,
        BookingRepository bookingRepository,
        SmartCampusProperties properties
    ) {
        this.eventRepository = eventRepository;
        this.recipientRepository = recipientRepository;
        this.linkRepository = linkRepository;
        this.preferenceRepository = preferenceRepository;
        this.deliveryAttemptRepository = deliveryAttemptRepository;
        this.userRepository = userRepository;
        this.managerRepository = managerRepository;
        this.bookingRepository = bookingRepository;
        this.properties = properties;
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> listNotifications(UserEntity user, String status, NotificationDomain domain, Integer limit) {
        Objects.requireNonNull(user, "User is required.");
        boolean unreadOnly = "unread".equalsIgnoreCase(status);
        int resolvedLimit = normalizeLimit(limit);
        return recipientRepository.findForUser(user.getId(), unreadOnly, domain, PageRequest.of(0, resolvedLimit)).stream()
            .map(this::toNotificationResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public NotificationUnreadCountResponse unreadCount(UserEntity user) {
        Objects.requireNonNull(user, "User is required.");
        return new NotificationUnreadCountResponse(
            recipientRepository.countByRecipientUserIdAndReadAtIsNullAndArchivedAtIsNull(user.getId())
        );
    }

    @Transactional
    public NotificationResponse markAsRead(UserEntity user, UUID notificationId) {
        Objects.requireNonNull(user, "User is required.");
        NotificationRecipientEntity recipient = recipientRepository
            .findByIdAndRecipientUserId(notificationId, user.getId())
            .orElseThrow(() -> new NotFoundException("Notification not found."));

        if (recipient.getReadAt() == null) {
            recipient.setReadAt(Instant.now());
        }

        return toNotificationResponse(recipient);
    }

    @Transactional
    public NotificationUnreadCountResponse markAllAsRead(UserEntity user) {
        Objects.requireNonNull(user, "User is required.");
        recipientRepository.markAllUnreadAsRead(user.getId(), Instant.now());
        return unreadCount(user);
    }

    @Transactional(readOnly = true)
    public NotificationPreferencesResponse getPreferences(UserEntity user) {
        return toPreferencesResponse(requirePreference(user));
    }

    @Transactional
    public NotificationPreferencesResponse updatePreferences(UserEntity user, UpdateNotificationPreferencesRequest request) {
        Objects.requireNonNull(user, "User is required.");
        Objects.requireNonNull(request, "Request is required.");

        NotificationPreferenceEntity preference = requirePreference(user);
        if (request.inAppEnabled() != null) {
            preference.setInAppEnabled(request.inAppEnabled());
        }
        if (request.emailEnabled() != null) {
            preference.setEmailEnabled(request.emailEnabled());
        }

        return toPreferencesResponse(preference);
    }

    @Transactional(readOnly = true)
    public List<NotificationDeliveryResponse> listEmailDeliveries(UserEntity user, NotificationDeliveryStatus status, Integer limit) {
        if (user.getUserType() != UserType.ADMIN) {
            throw new ForbiddenException("Admin access is required.");
        }
        int resolvedLimit = normalizeLimit(limit);
        return deliveryAttemptRepository
            .findForAdmin(NotificationDeliveryChannel.EMAIL, status, PageRequest.of(0, resolvedLimit))
            .stream()
            .map(this::toDeliveryResponse)
            .toList();
    }

    @Transactional
    public void notifyTicketCreated(TicketEntity ticket) {
        Objects.requireNonNull(ticket, "Ticket is required.");
        List<RecipientTarget> recipients = activeAdmins().stream()
            .map(user -> new RecipientTarget(user, ticketActionUrl(user, ticket)))
            .toList();

        createEvent(new NotificationRequest(
            NotificationDomain.TICKET,
            "TICKET_CREATED",
            NotificationSeverity.ACTION_REQUIRED,
            "New ticket needs assignment",
            ticket.getTicketCode() + " - " + ticket.getTitle(),
            ticket.getReportedBy(),
            "ticket-created:" + ticket.getId(),
            recipients,
            ticketLinks(ticket, null)
        ));

        if (ticket.getPriority() == TicketPriority.URGENT) {
            notifyUrgentTicket(ticket);
        }
    }

    @Transactional
    public void notifyUrgentTicket(TicketEntity ticket) {
        Objects.requireNonNull(ticket, "Ticket is required.");
        List<RecipientTarget> recipients = activeAdmins().stream()
            .map(user -> new RecipientTarget(user, ticketActionUrl(user, ticket)))
            .toList();

        createEvent(new NotificationRequest(
            NotificationDomain.TICKET,
            "TICKET_URGENT",
            NotificationSeverity.CRITICAL,
            "Urgent ticket reported",
            ticket.getTicketCode() + " requires immediate attention.",
            ticket.getReportedBy(),
            "ticket-urgent:" + ticket.getId(),
            recipients,
            ticketLinks(ticket, null)
        ));
    }

    @Transactional
    public void notifyTicketAssigned(TicketEntity ticket, UserEntity oldAssignee, UserEntity newAssignee, UserEntity actor) {
        Objects.requireNonNull(ticket, "Ticket is required.");
        if (newAssignee != null) {
            createEvent(new NotificationRequest(
                NotificationDomain.TICKET,
                "TICKET_ASSIGNED",
                NotificationSeverity.ACTION_REQUIRED,
                "Ticket assigned to you",
                ticket.getTicketCode() + " - " + ticket.getTitle(),
                actor,
                "ticket-assigned:" + ticket.getId() + ":" + newAssignee.getId() + ":" + Instant.now().toEpochMilli(),
                List.of(new RecipientTarget(newAssignee, ticketActionUrl(newAssignee, ticket))),
                ticketLinks(ticket, null)
            ));
        }

        if (oldAssignee != null && newAssignee != null && !oldAssignee.getId().equals(newAssignee.getId())) {
            createEvent(new NotificationRequest(
                NotificationDomain.TICKET,
                "TICKET_REASSIGNED_AWAY",
                NotificationSeverity.INFO,
                "Ticket reassigned",
                ticket.getTicketCode() + " has been reassigned.",
                actor,
                "ticket-reassigned-away:" + ticket.getId() + ":" + oldAssignee.getId() + ":" + Instant.now().toEpochMilli(),
                List.of(new RecipientTarget(oldAssignee, ticketActionUrl(oldAssignee, ticket))),
                ticketLinks(ticket, null)
            ));
        }
    }

    @Transactional
    public void notifyTicketStatusChanged(TicketEntity ticket, TicketStatus oldStatus, TicketStatus newStatus, UserEntity actor) {
        Objects.requireNonNull(ticket, "Ticket is required.");
        if (newStatus != TicketStatus.RESOLVED && newStatus != TicketStatus.REJECTED && newStatus != TicketStatus.CLOSED) {
            return;
        }
        UserEntity reporter = ticket.getReportedBy();
        if (reporter == null || (actor != null && reporter.getId().equals(actor.getId()))) {
            return;
        }

        NotificationSeverity severity = newStatus == TicketStatus.RESOLVED
            ? NotificationSeverity.SUCCESS
            : newStatus == TicketStatus.REJECTED ? NotificationSeverity.WARNING : NotificationSeverity.INFO;

        createEvent(new NotificationRequest(
            NotificationDomain.TICKET,
            "TICKET_" + newStatus.name(),
            severity,
            "Ticket " + statusLabel(newStatus),
            ticket.getTicketCode() + " changed from " + statusLabel(oldStatus) + " to " + statusLabel(newStatus) + ".",
            actor,
            "ticket-status:" + ticket.getId() + ":" + newStatus.name() + ":" + Instant.now().toEpochMilli(),
            List.of(new RecipientTarget(reporter, ticketActionUrl(reporter, ticket))),
            ticketLinks(ticket, null)
        ));
    }

    @Transactional
    public void notifyTicketCommentAdded(TicketEntity ticket, TicketCommentEntity comment) {
        Objects.requireNonNull(ticket, "Ticket is required.");
        Objects.requireNonNull(comment, "Comment is required.");

        UserEntity commenter = comment.getUser();
        List<RecipientTarget> recipients = new ArrayList<>();
        if (commenter != null && ticket.getReportedBy() != null && commenter.getId().equals(ticket.getReportedBy().getId())) {
            if (ticket.getAssignedTo() != null) {
                recipients.add(new RecipientTarget(ticket.getAssignedTo(), ticketActionUrl(ticket.getAssignedTo(), ticket)));
            }
        } else if (ticket.getReportedBy() != null) {
            recipients.add(new RecipientTarget(ticket.getReportedBy(), ticketActionUrl(ticket.getReportedBy(), ticket)));
        }

        createEvent(new NotificationRequest(
            NotificationDomain.TICKET,
            "TICKET_COMMENT_ADDED",
            NotificationSeverity.INFO,
            "New ticket comment",
            ticket.getTicketCode() + " has a new comment.",
            commenter,
            "ticket-comment:" + comment.getId(),
            recipients,
            ticketLinks(ticket, comment)
        ));
    }

    @Transactional
    public void notifyTicketSlaWarning(TicketEntity ticket, String slaKind, String dedupeKey) {
        notifyTicketSla(ticket, slaKind, NotificationSeverity.WARNING, "Ticket SLA warning", dedupeKey);
    }

    @Transactional
    public void notifyTicketSlaBreach(TicketEntity ticket, String slaKind, String dedupeKey) {
        notifyTicketSla(ticket, slaKind, NotificationSeverity.CRITICAL, "Ticket SLA breached", dedupeKey);
    }

    @Transactional
    public void notifyTicketResourceImpacted(TicketEntity ticket, ResourceStatus oldStatus, ResourceStatus newStatus) {
        if (ticket == null || ticket.getResource() == null || oldStatus == newStatus) {
            return;
        }

        List<RecipientTarget> recipients = activeAdminsAndCatalogManagers().stream()
            .filter(user -> ticket.getReportedBy() == null || !user.getId().equals(ticket.getReportedBy().getId()))
            .map(user -> new RecipientTarget(user, resourceActionUrl(user)))
            .toList();

        createEvent(new NotificationRequest(
            NotificationDomain.CATALOG,
            "RESOURCE_STATUS_CHANGED_BY_TICKET",
            NotificationSeverity.CRITICAL,
            "Resource marked unavailable",
            ticket.getResource().getCode() + " was marked " + newStatus.name() + " from urgent ticket " + ticket.getTicketCode() + ".",
            ticket.getReportedBy(),
            "resource-status-ticket:" + ticket.getResource().getId() + ":" + ticket.getId(),
            recipients,
            resourceLinks(ticket.getResource())
        ));
    }

    @Transactional
    public void notifyBookingCreated(BookingEntity booking) {
        Objects.requireNonNull(booking, "Booking is required.");
        List<RecipientTarget> recipients = activeAdminsAndBookingManagers().stream()
            .filter(user -> booking.getRequester() == null || !user.getId().equals(booking.getRequester().getId()))
            .map(user -> new RecipientTarget(user, bookingActionUrl(user)))
            .toList();

        createEvent(new NotificationRequest(
            NotificationDomain.BOOKING,
            "BOOKING_CREATED",
            NotificationSeverity.ACTION_REQUIRED,
            "New booking request",
            bookingLabel(booking) + " is waiting for approval.",
            booking.getRequester(),
            "booking-created:" + booking.getId(),
            recipients,
            bookingLinks(booking, null)
        ));
    }

    @Transactional
    public void notifyBookingApproved(BookingEntity booking, UserEntity actor) {
        notifyBookingRequester(
            booking,
            actor,
            "BOOKING_APPROVED",
            NotificationSeverity.SUCCESS,
            "Booking approved",
            bookingLabel(booking) + " has been approved.",
            "booking-approved:" + booking.getId() + ":" + nullSafeTime(booking.getDecidedAt())
        );
    }

    @Transactional
    public void notifyBookingRejected(BookingEntity booking, UserEntity actor) {
        notifyBookingRequester(
            booking,
            actor,
            "BOOKING_REJECTED",
            NotificationSeverity.WARNING,
            "Booking rejected",
            bookingLabel(booking) + " was rejected.",
            "booking-rejected:" + booking.getId() + ":" + nullSafeTime(booking.getDecidedAt())
        );
    }

    @Transactional
    public void notifyBookingCancelledByStaff(BookingEntity booking, UserEntity actor) {
        notifyBookingRequester(
            booking,
            actor,
            "BOOKING_CANCELLED",
            NotificationSeverity.WARNING,
            "Booking cancelled",
            bookingLabel(booking) + " was cancelled.",
            "booking-cancelled-staff:" + booking.getId() + ":" + nullSafeTime(booking.getCancelledAt())
        );
    }

    @Transactional
    public void notifyBookingCancelledByRequester(BookingEntity booking, UserEntity actor) {
        Objects.requireNonNull(booking, "Booking is required.");
        List<RecipientTarget> recipients = activeAdminsAndBookingManagers().stream()
            .filter(user -> actor == null || !user.getId().equals(actor.getId()))
            .map(user -> new RecipientTarget(user, bookingActionUrl(user)))
            .toList();

        createEvent(new NotificationRequest(
            NotificationDomain.BOOKING,
            "BOOKING_CANCELLED_BY_REQUESTER",
            NotificationSeverity.INFO,
            "Booking cancelled by requester",
            bookingLabel(booking) + " was cancelled by the requester.",
            actor,
            "booking-cancelled-requester:" + booking.getId() + ":" + nullSafeTime(booking.getCancelledAt()),
            recipients,
            bookingLinks(booking, null)
        ));
    }

    @Transactional
    public void notifyBookingAutoCancelled(BookingEntity booking) {
        notifyBookingRequester(
            booking,
            null,
            "BOOKING_CANCELLED",
            NotificationSeverity.WARNING,
            "Booking cancelled",
            bookingLabel(booking) + " was cancelled because the resource is unavailable.",
            "booking-auto-cancelled:" + booking.getId() + ":" + nullSafeTime(booking.getCancelledAt())
        );
    }

    @Transactional
    public void notifyModificationRequested(BookingModificationEntity modification) {
        Objects.requireNonNull(modification, "Modification is required.");
        BookingEntity booking = modification.getBooking();
        List<RecipientTarget> recipients = activeAdminsAndBookingManagers().stream()
            .filter(user -> modification.getRequestedBy() == null || !user.getId().equals(modification.getRequestedBy().getId()))
            .map(user -> new RecipientTarget(user, bookingActionUrl(user)))
            .toList();

        createEvent(new NotificationRequest(
            NotificationDomain.BOOKING,
            "BOOKING_MODIFICATION_REQUESTED",
            NotificationSeverity.ACTION_REQUIRED,
            "Booking change requested",
            bookingLabel(booking) + " has a pending change request.",
            modification.getRequestedBy(),
            "booking-modification-requested:" + modification.getId(),
            recipients,
            bookingLinks(booking, modification)
        ));
    }

    @Transactional
    public void notifyModificationApproved(BookingModificationEntity modification) {
        notifyModificationRequester(
            modification,
            "MODIFICATION_APPROVED",
            NotificationSeverity.SUCCESS,
            "Booking change approved",
            bookingLabel(modification.getBooking()) + " was updated."
        );
    }

    @Transactional
    public void notifyModificationRejected(BookingModificationEntity modification) {
        notifyModificationRequester(
            modification,
            "MODIFICATION_REJECTED",
            NotificationSeverity.WARNING,
            "Booking change rejected",
            bookingLabel(modification.getBooking()) + " change request was rejected."
        );
    }

    @Transactional
    public void notifyBookingReminder(BookingEntity booking, String reminderType) {
        NotificationSeverity severity = "BOOKING_REMINDER_1H".equals(reminderType)
            ? NotificationSeverity.ACTION_REQUIRED
            : NotificationSeverity.INFO;
        notifyBookingRequester(
            booking,
            null,
            reminderType,
            severity,
            "Booking reminder",
            bookingLabel(booking) + ("BOOKING_REMINDER_1H".equals(reminderType) ? " starts in 1 hour." : " starts in 24 hours."),
            "booking-reminder:" + reminderType + ":" + booking.getId()
        );
    }

    @Transactional
    public void notifyBookingNoShow(BookingEntity booking) {
        notifyBookingOutcomeAndManagers(
            booking,
            "BOOKING_NO_SHOW",
            NotificationSeverity.WARNING,
            "Booking marked no-show",
            bookingLabel(booking) + " was marked as no-show.",
            "booking-no-show:" + booking.getId()
        );
    }

    @Transactional
    public void notifyBookingCompleted(BookingEntity booking) {
        notifyBookingOutcomeAndManagers(
            booking,
            "BOOKING_COMPLETED",
            NotificationSeverity.SUCCESS,
            "Booking completed",
            bookingLabel(booking) + " was completed.",
            "booking-completed:" + booking.getId()
        );
    }

    @Transactional
    public void notifyResourceCreated(ResourceEntity resource, UserEntity actor) {
        notifyResourceEvent(
            resource,
            actor,
            "RESOURCE_CREATED",
            NotificationSeverity.INFO,
            "Resource added",
            resource.getCode() + " was added to the catalogue.",
            "resource-created:" + resource.getId()
        );
    }

    @Transactional
    public void notifyResourceUpdated(ResourceEntity resource, UserEntity actor) {
        notifyResourceEvent(
            resource,
            actor,
            "RESOURCE_UPDATED",
            NotificationSeverity.INFO,
            "Resource updated",
            resource.getCode() + " was updated.",
            "resource-updated:" + resource.getId() + ":" + Instant.now().toEpochMilli()
        );
    }

    @Transactional
    public void notifyResourceStatusChanged(ResourceEntity resource, ResourceStatus oldStatus, UserEntity actor) {
        if (resource == null || oldStatus == resource.getStatus()) {
            return;
        }

        NotificationSeverity severity = isUnavailable(resource)
            ? NotificationSeverity.WARNING
            : NotificationSeverity.INFO;

        Set<RecipientTarget> recipients = new LinkedHashSet<>();
        activeAdminsAndCatalogManagers().stream()
            .filter(user -> actor == null || !user.getId().equals(actor.getId()))
            .map(user -> new RecipientTarget(user, resourceActionUrl(user)))
            .forEach(recipients::add);

        if (isUnavailable(resource)) {
            activeBookingManagers().stream()
                .filter(user -> actor == null || !user.getId().equals(actor.getId()))
                .map(user -> new RecipientTarget(user, bookingActionUrl(user)))
                .forEach(recipients::add);

            bookingRepository
                .findAllByResourceIdAndStatusInAndStartTimeAfterOrderByStartTimeAsc(
                    resource.getId(),
                    FUTURE_BOOKING_STATUSES,
                    Instant.now()
                )
                .stream()
                .map(BookingEntity::getRequester)
                .filter(Objects::nonNull)
                .filter(user -> actor == null || !user.getId().equals(actor.getId()))
                .map(user -> new RecipientTarget(user, bookingActionUrl(user)))
                .forEach(recipients::add);
        }

        createEvent(new NotificationRequest(
            NotificationDomain.CATALOG,
            "RESOURCE_STATUS_CHANGED",
            severity,
            "Resource status changed",
            resource.getCode() + " changed from " + oldStatus.name() + " to " + resource.getStatus().name() + ".",
            actor,
            "resource-status:" + resource.getId() + ":" + resource.getStatus().name() + ":" + Instant.now().toEpochMilli(),
            List.copyOf(recipients),
            resourceLinks(resource)
        ));
    }

    private void notifyTicketSla(TicketEntity ticket, String slaKind, NotificationSeverity severity, String title, String dedupeKey) {
        Objects.requireNonNull(ticket, "Ticket is required.");
        List<UserEntity> users = ticket.getAssignedTo() == null
            ? activeAdmins()
            : List.of(ticket.getAssignedTo());

        List<RecipientTarget> recipients = users.stream()
            .map(user -> new RecipientTarget(user, ticketActionUrl(user, ticket)))
            .toList();

        createEvent(new NotificationRequest(
            NotificationDomain.TICKET,
            "TICKET_SLA_" + slaKind,
            severity,
            title,
            ticket.getTicketCode() + " has reached the " + slaKind.toLowerCase().replace('_', ' ') + " threshold.",
            null,
            dedupeKey,
            recipients,
            ticketLinks(ticket, null)
        ));
    }

    private void notifyBookingRequester(
        BookingEntity booking,
        UserEntity actor,
        String type,
        NotificationSeverity severity,
        String title,
        String body,
        String dedupeKey
    ) {
        Objects.requireNonNull(booking, "Booking is required.");
        UserEntity requester = booking.getRequester();
        if (requester == null || (actor != null && requester.getId().equals(actor.getId()))) {
            return;
        }

        createEvent(new NotificationRequest(
            NotificationDomain.BOOKING,
            type,
            severity,
            title,
            body,
            actor,
            dedupeKey,
            List.of(new RecipientTarget(requester, bookingActionUrl(requester))),
            bookingLinks(booking, null)
        ));
    }

    private void notifyModificationRequester(
        BookingModificationEntity modification,
        String type,
        NotificationSeverity severity,
        String title,
        String body
    ) {
        Objects.requireNonNull(modification, "Modification is required.");
        UserEntity requester = modification.getRequestedBy() != null
            ? modification.getRequestedBy()
            : modification.getBooking().getRequester();
        UserEntity actor = modification.getDecidedBy();
        if (requester == null || (actor != null && requester.getId().equals(actor.getId()))) {
            return;
        }

        createEvent(new NotificationRequest(
            NotificationDomain.BOOKING,
            type,
            severity,
            title,
            body,
            actor,
            "booking-modification-decision:" + modification.getId() + ":" + type,
            List.of(new RecipientTarget(requester, bookingActionUrl(requester))),
            bookingLinks(modification.getBooking(), modification)
        ));
    }

    private void notifyBookingOutcomeAndManagers(
        BookingEntity booking,
        String type,
        NotificationSeverity severity,
        String title,
        String body,
        String dedupeKey
    ) {
        Objects.requireNonNull(booking, "Booking is required.");
        Set<RecipientTarget> recipients = new LinkedHashSet<>();
        if (booking.getRequester() != null) {
            recipients.add(new RecipientTarget(booking.getRequester(), bookingActionUrl(booking.getRequester())));
        }
        activeBookingManagers().stream()
            .map(user -> new RecipientTarget(user, bookingActionUrl(user)))
            .forEach(recipients::add);

        createEvent(new NotificationRequest(
            NotificationDomain.BOOKING,
            type,
            severity,
            title,
            body,
            null,
            dedupeKey,
            List.copyOf(recipients),
            bookingLinks(booking, null)
        ));
    }

    private void notifyResourceEvent(
        ResourceEntity resource,
        UserEntity actor,
        String type,
        NotificationSeverity severity,
        String title,
        String body,
        String dedupeKey
    ) {
        Objects.requireNonNull(resource, "Resource is required.");
        List<RecipientTarget> recipients = activeAdminsAndCatalogManagers().stream()
            .filter(user -> actor == null || !user.getId().equals(actor.getId()))
            .map(user -> new RecipientTarget(user, resourceActionUrl(user)))
            .toList();

        createEvent(new NotificationRequest(
            NotificationDomain.CATALOG,
            type,
            severity,
            title,
            body,
            actor,
            dedupeKey,
            recipients,
            resourceLinks(resource)
        ));
    }

    private List<NotificationRecipientEntity> createEvent(NotificationRequest request) {
        if (request.recipients().isEmpty()) {
            return List.of();
        }

        Map<UUID, RecipientTarget> distinctRecipients = new LinkedHashMap<>();
        for (RecipientTarget target : request.recipients()) {
            if (isDeliverableUser(target.user())) {
                distinctRecipients.putIfAbsent(target.user().getId(), target);
            }
        }

        if (distinctRecipients.isEmpty()) {
            return List.of();
        }

        if (StringUtils.hasText(request.dedupeKey())) {
            NotificationEventEntity existingEvent = eventRepository.findByDedupeKey(request.dedupeKey()).orElse(null);
            if (existingEvent != null) {
                return List.of();
            }
        }

        NotificationEventEntity event = new NotificationEventEntity();
        event.setId(UUID.randomUUID());
        event.setDomain(request.domain());
        event.setType(request.type());
        event.setSeverity(request.severity());
        event.setTitle(request.title());
        event.setBody(request.body());
        event.setActorUser(request.actor());
        event.setDedupeKey(StringUtils.hasText(request.dedupeKey()) ? request.dedupeKey() : null);
        eventRepository.save(event);

        for (NotificationLink link : request.links()) {
            NotificationEventLinkEntity entity = new NotificationEventLinkEntity();
            entity.setId(UUID.randomUUID());
            entity.setEvent(event);
            entity.setTicketId(link.ticketId());
            entity.setTicketCommentId(link.ticketCommentId());
            entity.setBookingId(link.bookingId());
            entity.setBookingModificationId(link.bookingModificationId());
            entity.setResourceId(link.resourceId());
            entity.setLocationId(link.locationId());
            entity.setBuildingId(link.buildingId());
            entity.setResourceTypeId(link.resourceTypeId());
            entity.setUserId(link.userId());
            linkRepository.save(entity);
        }

        List<NotificationRecipientEntity> createdRecipients = new ArrayList<>();
        for (RecipientTarget target : distinctRecipients.values()) {
            NotificationRecipientEntity recipient = new NotificationRecipientEntity();
            recipient.setId(UUID.randomUUID());
            recipient.setEvent(event);
            recipient.setRecipientUser(target.user());
            recipient.setActionUrl(target.actionUrl());
            recipientRepository.save(recipient);
            createDeliveryAttempts(recipient, target.user());
            createdRecipients.add(recipient);
        }

        return createdRecipients;
    }

    private void createDeliveryAttempts(NotificationRecipientEntity recipient, UserEntity user) {
        NotificationDeliveryAttemptEntity inAppAttempt = new NotificationDeliveryAttemptEntity();
        inAppAttempt.setId(UUID.randomUUID());
        inAppAttempt.setRecipient(recipient);
        inAppAttempt.setChannel(NotificationDeliveryChannel.IN_APP);
        inAppAttempt.setStatus(NotificationDeliveryStatus.SENT);
        inAppAttempt.setAttemptCount(1);
        inAppAttempt.setSentAt(Instant.now());
        deliveryAttemptRepository.save(inAppAttempt);

        NotificationPreferenceEntity preference = requirePreference(user);
        NotificationDeliveryAttemptEntity emailAttempt = new NotificationDeliveryAttemptEntity();
        emailAttempt.setId(UUID.randomUUID());
        emailAttempt.setRecipient(recipient);
        emailAttempt.setChannel(NotificationDeliveryChannel.EMAIL);

        if (!properties.getNotifications().getEmail().isEnabled()) {
            emailAttempt.setStatus(NotificationDeliveryStatus.SKIPPED);
            emailAttempt.setFailureReason("Email notifications are disabled.");
        } else if (!preference.isEmailEnabled()) {
            emailAttempt.setStatus(NotificationDeliveryStatus.SKIPPED);
            emailAttempt.setFailureReason("User disabled email notifications.");
        } else if (!StringUtils.hasText(user.getEmail())) {
            emailAttempt.setStatus(NotificationDeliveryStatus.SKIPPED);
            emailAttempt.setFailureReason("Recipient does not have an email address.");
        } else {
            emailAttempt.setStatus(NotificationDeliveryStatus.PENDING);
            emailAttempt.setNextAttemptAt(Instant.now());
        }

        deliveryAttemptRepository.save(emailAttempt);
    }

    private NotificationPreferenceEntity requirePreference(UserEntity user) {
        Objects.requireNonNull(user, "User is required.");
        return preferenceRepository.findByUserId(user.getId()).orElseGet(() -> {
            NotificationPreferenceEntity preference = new NotificationPreferenceEntity();
            preference.setUser(user);
            preference.setInAppEnabled(true);
            preference.setEmailEnabled(defaultEmailEnabled(user));
            return preferenceRepository.save(preference);
        });
    }

    private boolean defaultEmailEnabled(UserEntity user) {
        return user.getAccountStatus() == AccountStatus.ACTIVE;
    }

    private NotificationResponse toNotificationResponse(NotificationRecipientEntity recipient) {
        NotificationEventEntity event = recipient.getEvent();
        NotificationDeliveryStatus emailStatus = deliveryAttemptRepository
            .findFirstByRecipientIdAndChannel(recipient.getId(), NotificationDeliveryChannel.EMAIL)
            .map(NotificationDeliveryAttemptEntity::getStatus)
            .orElse(null);

        return new NotificationResponse(
            recipient.getId(),
            event.getId(),
            event.getDomain(),
            event.getType(),
            event.getSeverity(),
            event.getTitle(),
            event.getBody(),
            event.getActorUser() == null ? null : event.getActorUser().getId(),
            event.getActorUser() == null ? null : event.getActorUser().getEmail(),
            recipient.getActionUrl(),
            recipient.getCreatedAt(),
            recipient.getReadAt(),
            recipient.getArchivedAt(),
            emailStatus,
            linkRepository.findByEventId(event.getId()).stream()
                .map(this::toLinkResponse)
                .toList()
        );
    }

    private NotificationLinkResponse toLinkResponse(NotificationEventLinkEntity link) {
        return new NotificationLinkResponse(
            link.getTicketId(),
            link.getTicketCommentId(),
            link.getBookingId(),
            link.getBookingModificationId(),
            link.getResourceId(),
            link.getLocationId(),
            link.getBuildingId(),
            link.getResourceTypeId(),
            link.getUserId()
        );
    }

    private NotificationPreferencesResponse toPreferencesResponse(NotificationPreferenceEntity preference) {
        return new NotificationPreferencesResponse(preference.isInAppEnabled(), preference.isEmailEnabled());
    }

    private NotificationDeliveryResponse toDeliveryResponse(NotificationDeliveryAttemptEntity attempt) {
        NotificationRecipientEntity recipient = attempt.getRecipient();
        NotificationEventEntity event = recipient.getEvent();
        UserEntity recipientUser = recipient.getRecipientUser();
        return new NotificationDeliveryResponse(
            attempt.getId(),
            recipient.getId(),
            event.getId(),
            recipientUser.getId(),
            recipientUser.getEmail(),
            event.getDomain(),
            event.getType(),
            event.getSeverity(),
            event.getTitle(),
            attempt.getStatus(),
            attempt.getAttemptCount(),
            attempt.getNextAttemptAt(),
            attempt.getSentAt(),
            attempt.getFailedAt(),
            attempt.getFailureReason(),
            attempt.getCreatedAt()
        );
    }

    private List<UserEntity> activeAdmins() {
        return userRepository.findByUserTypeAndAccountStatus(UserType.ADMIN, AccountStatus.ACTIVE);
    }

    private List<UserEntity> activeBookingManagers() {
        return managerRepository.findByManagerRoleAndUserAccountStatus(ManagerRole.BOOKING_MANAGER, AccountStatus.ACTIVE)
            .stream()
            .map(ManagerEntity::getUser)
            .toList();
    }

    private List<UserEntity> activeCatalogManagers() {
        return managerRepository.findByManagerRoleAndUserAccountStatus(ManagerRole.CATALOG_MANAGER, AccountStatus.ACTIVE)
            .stream()
            .map(ManagerEntity::getUser)
            .toList();
    }

    private List<UserEntity> activeAdminsAndBookingManagers() {
        return mergeUsers(activeAdmins(), activeBookingManagers());
    }

    private List<UserEntity> activeAdminsAndCatalogManagers() {
        return mergeUsers(activeAdmins(), activeCatalogManagers());
    }

    private List<UserEntity> mergeUsers(List<UserEntity> first, List<UserEntity> second) {
        Map<UUID, UserEntity> usersById = new LinkedHashMap<>();
        first.forEach(user -> usersById.put(user.getId(), user));
        second.forEach(user -> usersById.put(user.getId(), user));
        return new ArrayList<>(usersById.values());
    }

    private boolean isDeliverableUser(UserEntity user) {
        return user != null
            && user.getId() != null
            && user.getAccountStatus() == AccountStatus.ACTIVE;
    }

    private String ticketActionUrl(UserEntity user, TicketEntity ticket) {
        String ticketRef = ticket.getTicketCode() != null ? ticket.getTicketCode() : ticket.getId().toString();
        if (user.getUserType() == UserType.ADMIN) {
            return "/admin/tickets/" + ticketRef;
        }
        if (user.getUserType() == UserType.MANAGER) {
            if (user.getManagerProfile() != null && user.getManagerProfile().getManagerRole() == ManagerRole.CATALOG_MANAGER) {
                return "/managers/catalog/tickets/" + ticketRef;
            }
            return "/ticket-managers/tickets/" + ticketRef;
        }
        return "/students/tickets/" + ticketRef;
    }

    private String bookingActionUrl(UserEntity user) {
        if (user.getUserType() == UserType.ADMIN) {
            return "/admin/bookings";
        }
        if (user.getUserType() == UserType.MANAGER) {
            return "/booking-managers/bookings";
        }
        if (user.getUserType() == UserType.FACULTY) {
            return "/faculty/bookings";
        }
        return "/students/bookings";
    }

    private String resourceActionUrl(UserEntity user) {
        if (user.getUserType() == UserType.ADMIN) {
            return "/admin/resources";
        }
        return "/managers/catalog";
    }

    private List<NotificationLink> ticketLinks(TicketEntity ticket, TicketCommentEntity comment) {
        List<NotificationLink> links = new ArrayList<>();
        links.add(NotificationLink.ticket(ticket.getId()));
        if (comment != null) {
            links.add(NotificationLink.ticketComment(comment.getId()));
        }
        if (ticket.getResourceId() != null) {
            links.add(NotificationLink.resource(ticket.getResourceId()));
        }
        if (ticket.getLocationId() != null) {
            links.add(NotificationLink.location(ticket.getLocationId()));
        }
        return links;
    }

    private List<NotificationLink> bookingLinks(BookingEntity booking, BookingModificationEntity modification) {
        List<NotificationLink> links = new ArrayList<>();
        links.add(NotificationLink.booking(booking.getId()));
        if (modification != null) {
            links.add(NotificationLink.bookingModification(modification.getId()));
        }
        if (booking.getResource() != null) {
            links.add(NotificationLink.resource(booking.getResource().getId()));
        }
        return links;
    }

    private List<NotificationLink> resourceLinks(ResourceEntity resource) {
        List<NotificationLink> links = new ArrayList<>();
        links.add(NotificationLink.resource(resource.getId()));
        if (resource.getLocationEntity() != null) {
            links.add(NotificationLink.location(resource.getLocationEntity().getId()));
            if (resource.getLocationEntity().getBuilding() != null) {
                links.add(NotificationLink.building(resource.getLocationEntity().getBuilding().getId()));
            }
        }
        if (resource.getResourceType() != null) {
            links.add(NotificationLink.resourceType(resource.getResourceType().getId()));
        }
        return links;
    }

    private String bookingLabel(BookingEntity booking) {
        String resourceName = booking.getResource() == null ? "Booking" : booking.getResource().getName();
        return resourceName + " booking";
    }

    private boolean isUnavailable(ResourceEntity resource) {
        return resource.getStatus() == ResourceStatus.OUT_OF_SERVICE
            || resource.getStatus() == ResourceStatus.MAINTENANCE
            || resource.getStatus() == ResourceStatus.INACTIVE
            || !resource.isBookable();
    }

    private String statusLabel(TicketStatus status) {
        if (status == null) {
            return "new";
        }
        return status.name().toLowerCase().replace('_', ' ');
    }

    private String nullSafeTime(Instant instant) {
        return instant == null ? "none" : String.valueOf(instant.toEpochMilli());
    }

    private int normalizeLimit(Integer limit) {
        if (limit == null || limit < 1) {
            return DEFAULT_LIMIT;
        }
        return Math.min(limit, MAX_LIMIT);
    }

    public record NotificationLink(
        UUID ticketId,
        UUID ticketCommentId,
        UUID bookingId,
        UUID bookingModificationId,
        UUID resourceId,
        UUID locationId,
        UUID buildingId,
        UUID resourceTypeId,
        UUID userId
    ) {
        public static NotificationLink ticket(UUID id) {
            return new NotificationLink(id, null, null, null, null, null, null, null, null);
        }

        public static NotificationLink ticketComment(UUID id) {
            return new NotificationLink(null, id, null, null, null, null, null, null, null);
        }

        public static NotificationLink booking(UUID id) {
            return new NotificationLink(null, null, id, null, null, null, null, null, null);
        }

        public static NotificationLink bookingModification(UUID id) {
            return new NotificationLink(null, null, null, id, null, null, null, null, null);
        }

        public static NotificationLink resource(UUID id) {
            return new NotificationLink(null, null, null, null, id, null, null, null, null);
        }

        public static NotificationLink location(UUID id) {
            return new NotificationLink(null, null, null, null, null, id, null, null, null);
        }

        public static NotificationLink building(UUID id) {
            return new NotificationLink(null, null, null, null, null, null, id, null, null);
        }

        public static NotificationLink resourceType(UUID id) {
            return new NotificationLink(null, null, null, null, null, null, null, id, null);
        }
    }

    private record RecipientTarget(UserEntity user, String actionUrl) {
    }

    private record NotificationRequest(
        NotificationDomain domain,
        String type,
        NotificationSeverity severity,
        String title,
        String body,
        UserEntity actor,
        String dedupeKey,
        List<RecipientTarget> recipients,
        List<NotificationLink> links
    ) {
    }
}
