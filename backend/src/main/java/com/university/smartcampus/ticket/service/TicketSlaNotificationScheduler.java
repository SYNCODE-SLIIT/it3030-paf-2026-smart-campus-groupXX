package com.university.smartcampus.ticket.service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.university.smartcampus.common.enums.AppEnums.TicketStatus;
import com.university.smartcampus.notification.NotificationService;
import com.university.smartcampus.ticket.entity.TicketEntity;
import com.university.smartcampus.ticket.repository.TicketRepository;

@Component
public class TicketSlaNotificationScheduler {

    private static final List<TicketStatus> ACTIVE_STATUSES = List.of(TicketStatus.OPEN, TicketStatus.IN_PROGRESS);

    private final TicketRepository ticketRepository;
    private final NotificationService notificationService;

    public TicketSlaNotificationScheduler(TicketRepository ticketRepository, NotificationService notificationService) {
        this.ticketRepository = ticketRepository;
        this.notificationService = notificationService;
    }

    @Scheduled(fixedDelayString = "${app.notifications.ticket-sla.fixed-delay-ms:600000}")
    @Transactional
    public void publishSlaNotifications() {
        Instant now = Instant.now();
        for (TicketEntity ticket : ticketRepository.findByStatusIn(ACTIVE_STATUSES)) {
            publishTicketSlaNotifications(ticket, now);
        }
    }

    private void publishTicketSlaNotifications(TicketEntity ticket, Instant now) {
        if (ticket.getCreatedAt() == null || ticket.getPriority() == null) {
            return;
        }

        if (ticket.getStatus() == TicketStatus.OPEN) {
            publishThresholds(ticket, now, "TTFR", SlaTargets.TTFR.get(ticket.getPriority()));
        }

        if (ticket.getStatus() == TicketStatus.IN_PROGRESS) {
            publishThresholds(ticket, now, "TTR", SlaTargets.TTR.get(ticket.getPriority()));
        }
    }

    private void publishThresholds(TicketEntity ticket, Instant now, String slaKind, Duration target) {
        if (target == null) {
            return;
        }

        Instant warningAt = ticket.getCreatedAt().plus(target.multipliedBy(3).dividedBy(4));
        Instant breachAt = ticket.getCreatedAt().plus(target);

        if (!now.isBefore(warningAt)) {
            notificationService.notifyTicketSlaWarning(
                ticket,
                slaKind + "_WARNING",
                "ticket-sla-warning:" + slaKind + ":" + ticket.getId()
            );
        }

        if (!now.isBefore(breachAt)) {
            notificationService.notifyTicketSlaBreach(
                ticket,
                slaKind + "_BREACH",
                "ticket-sla-breach:" + slaKind + ":" + ticket.getId()
            );
        }
    }
}
