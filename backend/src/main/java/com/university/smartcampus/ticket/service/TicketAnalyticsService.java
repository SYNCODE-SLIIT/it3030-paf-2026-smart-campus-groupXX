package com.university.smartcampus.ticket.service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.university.smartcampus.common.enums.AppEnums.ManagerRole;
import com.university.smartcampus.common.enums.AppEnums.TicketCategory;
import com.university.smartcampus.common.enums.AppEnums.TicketPriority;
import com.university.smartcampus.common.enums.AppEnums.TicketStatus;
import com.university.smartcampus.common.enums.AppEnums.UserType;
import com.university.smartcampus.common.exception.BadRequestException;
import com.university.smartcampus.common.exception.ForbiddenException;
import com.university.smartcampus.ticket.dto.TicketDtos.TicketAnalyticsAssignment;
import com.university.smartcampus.ticket.dto.TicketDtos.TicketAnalyticsAttentionTicket;
import com.university.smartcampus.ticket.dto.TicketDtos.TicketAnalyticsBreakdownRow;
import com.university.smartcampus.ticket.dto.TicketDtos.TicketAnalyticsBucket;
import com.university.smartcampus.ticket.dto.TicketDtos.TicketAnalyticsCommunication;
import com.university.smartcampus.ticket.dto.TicketDtos.TicketAnalyticsManagerPerformance;
import com.university.smartcampus.ticket.dto.TicketDtos.TicketAnalyticsResponse;
import com.university.smartcampus.ticket.dto.TicketDtos.TicketAnalyticsSla;
import com.university.smartcampus.ticket.dto.TicketDtos.TicketAnalyticsSlaRow;
import com.university.smartcampus.ticket.dto.TicketDtos.TicketAnalyticsStatusEvent;
import com.university.smartcampus.ticket.dto.TicketDtos.TicketAnalyticsSummary;
import com.university.smartcampus.ticket.dto.TicketDtos.TicketAnalyticsTiming;
import com.university.smartcampus.ticket.dto.TicketDtos.TicketAnalyticsTrendPoint;
import com.university.smartcampus.ticket.entity.TicketAssignmentHistoryEntity;
import com.university.smartcampus.ticket.entity.TicketEntity;
import com.university.smartcampus.ticket.entity.TicketStatusHistoryEntity;
import com.university.smartcampus.ticket.repository.TicketAssignmentHistoryRepository;
import com.university.smartcampus.ticket.repository.TicketAttachmentRepository;
import com.university.smartcampus.ticket.repository.TicketCommentRepository;
import com.university.smartcampus.ticket.repository.TicketRepository;
import com.university.smartcampus.ticket.repository.TicketStatusHistoryRepository;
import com.university.smartcampus.user.entity.UserEntity;

@Service
public class TicketAnalyticsService {

    private static final Duration DEFAULT_RANGE = Duration.ofDays(30);
    private static final int ATTENTION_LIMIT = 10;
    private static final int RECENT_EVENT_LIMIT = 12;

    private final TicketRepository ticketRepository;
    private final TicketStatusHistoryRepository ticketStatusHistoryRepository;
    private final TicketCommentRepository ticketCommentRepository;
    private final TicketAttachmentRepository ticketAttachmentRepository;
    private final TicketAssignmentHistoryRepository ticketAssignmentHistoryRepository;

    public TicketAnalyticsService(
            TicketRepository ticketRepository,
            TicketStatusHistoryRepository ticketStatusHistoryRepository,
            TicketCommentRepository ticketCommentRepository,
            TicketAttachmentRepository ticketAttachmentRepository,
            TicketAssignmentHistoryRepository ticketAssignmentHistoryRepository) {
        this.ticketRepository = ticketRepository;
        this.ticketStatusHistoryRepository = ticketStatusHistoryRepository;
        this.ticketCommentRepository = ticketCommentRepository;
        this.ticketAttachmentRepository = ticketAttachmentRepository;
        this.ticketAssignmentHistoryRepository = ticketAssignmentHistoryRepository;
    }

    @Transactional(readOnly = true)
    public TicketAnalyticsResponse getAnalytics(
            UserEntity user,
            Instant requestedFrom,
            Instant requestedTo,
            TicketAnalyticsBucket requestedBucket,
            UUID assigneeId,
            Boolean unassignedOnly,
            TicketCategory category,
            TicketPriority priority) {
        if (!isAdmin(user) && !isTicketManager(user)) {
            throw new ForbiddenException("Ticket analytics access is required.");
        }

        Instant now = Instant.now();
        Instant to = requestedTo != null ? requestedTo : now;
        Instant from = requestedFrom != null ? requestedFrom : to.minus(DEFAULT_RANGE);
        if (from.isAfter(to)) {
            throw new BadRequestException("Analytics start date must be before the end date.");
        }
        TicketAnalyticsBucket bucket = requestedBucket != null ? requestedBucket : TicketAnalyticsBucket.DAY;

        Specification<TicketEntity> spec = analyticsSpec(user, assigneeId, unassignedOnly, category, priority);
        List<TicketEntity> tickets = ticketRepository.findAll(spec, Sort.by(Sort.Direction.ASC, "createdAt"));
        List<UUID> ticketIds = tickets.stream().map(TicketEntity::getId).toList();

        Map<UUID, TicketEntity> ticketsById = tickets.stream()
                .collect(Collectors.toMap(TicketEntity::getId, ticket -> ticket));
        List<TicketStatusHistoryEntity> statusHistory = ticketIds.isEmpty()
                ? List.of()
                : ticketStatusHistoryRepository.findByTicketIdInOrderByChangedAtAsc(ticketIds);
        List<TicketAssignmentHistoryEntity> assignmentHistory = ticketIds.isEmpty()
                ? List.of()
                : ticketAssignmentHistoryRepository.findByTicketIdInOrderByChangedAtAsc(ticketIds);
        Map<UUID, List<TicketStatusHistoryEntity>> statusHistoryByTicket = statusHistory.stream()
                .collect(Collectors.groupingBy(history -> history.getTicket().getId()));
        Map<UUID, List<TicketAssignmentHistoryEntity>> assignmentHistoryByTicket = assignmentHistory.stream()
                .collect(Collectors.groupingBy(history -> history.getTicket().getId()));

        Map<UUID, Long> commentCounts = ticketIds.isEmpty()
                ? Map.of()
                : countMap(ticketCommentRepository.countByTicketIds(ticketIds));
        Map<UUID, Long> attachmentCounts = ticketIds.isEmpty()
                ? Map.of()
                : countMap(ticketAttachmentRepository.countByTicketIds(ticketIds));

        return new TicketAnalyticsResponse(
                from,
                to,
                bucket,
                buildSummary(tickets, statusHistoryByTicket, from, to),
                buildTiming(tickets, statusHistoryByTicket, assignmentHistoryByTicket, from, to, now),
                buildCommunication(tickets, commentCounts, attachmentCounts),
                buildAssignment(assignmentHistory, from, to),
                buildStatusBreakdown(tickets),
                buildPriorityBreakdown(tickets),
                buildCategoryBreakdown(tickets),
                buildTrends(tickets, statusHistoryByTicket, from, to, bucket),
                buildAttentionTickets(tickets, statusHistoryByTicket, now),
                buildRecentEvents(statusHistory, ticketsById, from, to),
                isAdmin(user) ? buildManagerPerformance(tickets, statusHistoryByTicket, assignmentHistory, from, to) : List.of(),
                buildSla(tickets, statusHistoryByTicket));
    }

    private Specification<TicketEntity> analyticsSpec(
            UserEntity user,
            UUID assigneeId,
            Boolean unassignedOnly,
            TicketCategory category,
            TicketPriority priority) {
        Specification<TicketEntity> spec = (root, query, cb) -> cb.conjunction();

        if (isAdmin(user)) {
            if (assigneeId != null && Boolean.TRUE.equals(unassignedOnly)) {
                throw new BadRequestException("Assignee and unassigned filters cannot be combined.");
            }
            if (assigneeId != null) {
                spec = spec.and((root, query, cb) -> cb.equal(root.get("assignedTo").get("id"), assigneeId));
            }
            if (Boolean.TRUE.equals(unassignedOnly)) {
                spec = spec.and((root, query, cb) -> cb.isNull(root.get("assignedTo")));
            }
        } else {
            if (assigneeId != null || unassignedOnly != null) {
                throw new BadRequestException("Ticket managers cannot filter analytics by assignee or unassigned queue.");
            }
            UUID userId = user.getId();
            spec = spec.and((root, query, cb) -> cb.equal(root.get("assignedTo").get("id"), userId));
        }

        if (category != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("category"), category));
        }
        if (priority != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("priority"), priority));
        }

        return spec;
    }

    private TicketAnalyticsSummary buildSummary(
            List<TicketEntity> tickets,
            Map<UUID, List<TicketStatusHistoryEntity>> statusHistoryByTicket,
            Instant from,
            Instant to) {
        long open = tickets.stream().filter(ticket -> ticket.getStatus() == TicketStatus.OPEN).count();
        long inProgress = tickets.stream().filter(ticket -> ticket.getStatus() == TicketStatus.IN_PROGRESS).count();
        long resolved = tickets.stream().filter(ticket -> ticket.getStatus() == TicketStatus.RESOLVED).count();
        long closed = tickets.stream().filter(ticket -> ticket.getStatus() == TicketStatus.CLOSED).count();
        long rejected = tickets.stream().filter(ticket -> ticket.getStatus() == TicketStatus.REJECTED).count();
        long positiveOutcomesInWindow = tickets.stream()
                .filter(this::hasPositiveOutcome)
                .filter(ticket -> positiveOutcomeAt(ticket).filter(value -> isWithin(value, from, to)).isPresent())
                .count();
        long rejectedInWindow = tickets.stream()
                .filter(ticket -> firstStatusAt(
                        statusHistoryByTicket.getOrDefault(ticket.getId(), List.of()), TicketStatus.REJECTED)
                        .filter(value -> isWithin(value, from, to))
                        .isPresent())
                .count();
        long outcomesInWindow = positiveOutcomesInWindow + rejectedInWindow;

        return new TicketAnalyticsSummary(
                tickets.size(),
                open + inProgress,
                open,
                inProgress,
                resolved,
                closed,
                rejected,
                tickets.stream().filter(ticket -> ticket.getStatus() == TicketStatus.OPEN && ticket.getAssignedTo() == null).count(),
                tickets.stream().filter(ticket -> ticket.getPriority() == TicketPriority.URGENT && isActive(ticket)).count(),
                outcomesInWindow == 0 ? null : roundPercent(positiveOutcomesInWindow, outcomesInWindow),
                outcomesInWindow == 0 ? null : roundPercent(rejectedInWindow, outcomesInWindow));
    }

    private TicketAnalyticsTiming buildTiming(
            List<TicketEntity> tickets,
            Map<UUID, List<TicketStatusHistoryEntity>> statusHistoryByTicket,
            Map<UUID, List<TicketAssignmentHistoryEntity>> assignmentHistoryByTicket,
            Instant from,
            Instant to,
            Instant now) {
        List<Long> activeAges = new ArrayList<>();
        List<Long> assignmentTimes = new ArrayList<>();
        List<Long> acceptTimes = new ArrayList<>();
        List<Long> resolveTimes = new ArrayList<>();
        List<Long> inProgressTimes = new ArrayList<>();
        List<Long> closureLags = new ArrayList<>();

        for (TicketEntity ticket : tickets) {
            if (isActive(ticket)) {
                activeAges.add(minutesBetween(ticket.getCreatedAt(), now));
            }

            firstAssignmentAt(assignmentHistoryByTicket.getOrDefault(ticket.getId(), List.of()))
                    .filter(assignedAt -> isWithin(assignedAt, from, to))
                    .ifPresent(assignedAt -> assignmentTimes.add(minutesBetween(ticket.getCreatedAt(), assignedAt)));

            Optional<Instant> acceptedAt = firstStatusAt(
                    statusHistoryByTicket.getOrDefault(ticket.getId(), List.of()), TicketStatus.IN_PROGRESS);
            acceptedAt
                    .filter(value -> isWithin(value, from, to))
                    .ifPresent(value -> acceptTimes.add(minutesBetween(ticket.getCreatedAt(), value)));

            if (ticket.getResolvedAt() != null && isWithin(ticket.getResolvedAt(), from, to)) {
                resolveTimes.add(minutesBetween(ticket.getCreatedAt(), ticket.getResolvedAt()));
                acceptedAt.ifPresent(value -> inProgressTimes.add(minutesBetween(value, ticket.getResolvedAt())));
            }

            if (ticket.getResolvedAt() != null && ticket.getClosedAt() != null && isWithin(ticket.getClosedAt(), from, to)) {
                closureLags.add(minutesBetween(ticket.getResolvedAt(), ticket.getClosedAt()));
            }
        }

        return new TicketAnalyticsTiming(
                average(activeAges),
                average(assignmentTimes),
                average(acceptTimes),
                average(resolveTimes),
                average(inProgressTimes),
                average(closureLags));
    }

    private TicketAnalyticsCommunication buildCommunication(
            List<TicketEntity> tickets,
            Map<UUID, Long> commentCounts,
            Map<UUID, Long> attachmentCounts) {
        long totalComments = commentCounts.values().stream().mapToLong(Long::longValue).sum();
        long totalAttachments = attachmentCounts.values().stream().mapToLong(Long::longValue).sum();
        long ticketsWithAttachments = attachmentCounts.values().stream().filter(count -> count > 0).count();

        return new TicketAnalyticsCommunication(
                totalComments,
                averagePerTicket(totalComments, tickets.size()),
                ticketsWithAttachments,
                totalAttachments,
                averagePerTicket(totalAttachments, tickets.size()));
    }

    private TicketAnalyticsAssignment buildAssignment(
            List<TicketAssignmentHistoryEntity> assignmentHistory,
            Instant from,
            Instant to) {
        List<TicketAssignmentHistoryEntity> windowAssignments = assignmentHistory.stream()
                .filter(history -> history.getNewAssignee() != null)
                .filter(history -> isWithin(history.getChangedAt(), from, to))
                .toList();

        return new TicketAnalyticsAssignment(
                windowAssignments.size(),
                windowAssignments.stream().filter(history -> history.getOldAssignee() != null).count(),
                windowAssignments.stream().map(history -> history.getTicket().getId()).distinct().count());
    }

    private List<TicketAnalyticsBreakdownRow> buildStatusBreakdown(List<TicketEntity> tickets) {
        Map<TicketStatus, Long> counts = new EnumMap<>(TicketStatus.class);
        for (TicketStatus status : TicketStatus.values()) {
            counts.put(status, tickets.stream().filter(ticket -> ticket.getStatus() == status).count());
        }
        return counts.entrySet().stream()
                .map(entry -> new TicketAnalyticsBreakdownRow(
                        entry.getKey().name(),
                        statusLabel(entry.getKey()),
                        entry.getValue(),
                        percentage(entry.getValue(), tickets.size())))
                .toList();
    }

    private List<TicketAnalyticsBreakdownRow> buildPriorityBreakdown(List<TicketEntity> tickets) {
        Map<TicketPriority, Long> counts = new EnumMap<>(TicketPriority.class);
        for (TicketPriority priority : TicketPriority.values()) {
            counts.put(priority, tickets.stream().filter(ticket -> ticket.getPriority() == priority).count());
        }
        return counts.entrySet().stream()
                .map(entry -> new TicketAnalyticsBreakdownRow(
                        entry.getKey().name(),
                        priorityLabel(entry.getKey()),
                        entry.getValue(),
                        percentage(entry.getValue(), tickets.size())))
                .toList();
    }

    private List<TicketAnalyticsBreakdownRow> buildCategoryBreakdown(List<TicketEntity> tickets) {
        Map<TicketCategory, Long> counts = new EnumMap<>(TicketCategory.class);
        for (TicketCategory category : TicketCategory.values()) {
            counts.put(category, tickets.stream().filter(ticket -> ticket.getCategory() == category).count());
        }
        return counts.entrySet().stream()
                .map(entry -> new TicketAnalyticsBreakdownRow(
                        entry.getKey().name(),
                        categoryLabel(entry.getKey()),
                        entry.getValue(),
                        percentage(entry.getValue(), tickets.size())))
                .toList();
    }

    private List<TicketAnalyticsTrendPoint> buildTrends(
            List<TicketEntity> tickets,
            Map<UUID, List<TicketStatusHistoryEntity>> statusHistoryByTicket,
            Instant from,
            Instant to,
            TicketAnalyticsBucket bucket) {
        List<BucketWindow> buckets = bucketWindows(from, to, bucket);
        List<TicketAnalyticsTrendPoint> points = new ArrayList<>();

        for (BucketWindow window : buckets) {
            Instant countStart = window.start().isBefore(from) ? from : window.start();
            Instant countEnd = window.end().isAfter(to) ? to : window.end();
            long created = tickets.stream()
                    .filter(ticket -> isWithin(ticket.getCreatedAt(), countStart, countEnd))
                    .count();
            long resolved = tickets.stream()
                    .filter(ticket -> ticket.getResolvedAt() != null && isWithin(ticket.getResolvedAt(), countStart, countEnd))
                    .count();
            long rejected = tickets.stream()
                    .filter(ticket -> firstStatusAt(
                            statusHistoryByTicket.getOrDefault(ticket.getId(), List.of()), TicketStatus.REJECTED)
                            .filter(value -> isWithin(value, countStart, countEnd))
                            .isPresent())
                    .count();
            long activeBacklog = tickets.stream()
                    .filter(ticket -> ticketWasActiveAtEndOfBucket(
                            ticket,
                            statusHistoryByTicket.getOrDefault(ticket.getId(), List.of()),
                            countEnd))
                    .count();

            points.add(new TicketAnalyticsTrendPoint(window.start(), window.end(), created, resolved, rejected, activeBacklog));
        }

        return points;
    }

    private List<TicketAnalyticsAttentionTicket> buildAttentionTickets(
            List<TicketEntity> tickets,
            Map<UUID, List<TicketStatusHistoryEntity>> statusHistoryByTicket,
            Instant now) {
        return tickets.stream()
                .filter(this::isActive)
                .map(ticket -> toAttentionTicket(ticket, statusHistoryByTicket.getOrDefault(ticket.getId(), List.of()), now))
                .flatMap(Optional::stream)
                .sorted(Comparator
                        .comparing((TicketAnalyticsAttentionTicket ticket) -> priorityRank(ticket.priority()))
                        .thenComparing(TicketAnalyticsAttentionTicket::ageMinutes, Comparator.reverseOrder()))
                .limit(ATTENTION_LIMIT)
                .toList();
    }

    private Optional<TicketAnalyticsAttentionTicket> toAttentionTicket(
            TicketEntity ticket,
            List<TicketStatusHistoryEntity> history,
            Instant now) {
        Instant lastStatusChangedAt = history.isEmpty()
                ? ticket.getCreatedAt()
                : history.get(history.size() - 1).getChangedAt();
        long ageMinutes = minutesBetween(ticket.getCreatedAt(), now);
        long staleMinutes = minutesBetween(lastStatusChangedAt, now);
        String reason = attentionReason(ticket, ageMinutes, staleMinutes);
        if (reason == null) {
            return Optional.empty();
        }

        return Optional.of(new TicketAnalyticsAttentionTicket(
                ticket.getId(),
                ticket.getTicketCode(),
                ticket.getTitle(),
                ticket.getCategory(),
                ticket.getPriority(),
                ticket.getStatus(),
                ticket.getAssignedTo() != null ? ticket.getAssignedTo().getId() : null,
                resolveAssignedToName(ticket.getAssignedTo()),
                ticket.getReportedBy().getEmail(),
                ticket.getCreatedAt(),
                lastStatusChangedAt,
                ageMinutes,
                reason));
    }

    private List<TicketAnalyticsStatusEvent> buildRecentEvents(
            List<TicketStatusHistoryEntity> statusHistory,
            Map<UUID, TicketEntity> ticketsById,
            Instant from,
            Instant to) {
        return statusHistory.stream()
                .filter(history -> isWithin(history.getChangedAt(), from, to))
                .sorted(Comparator.comparing(TicketStatusHistoryEntity::getChangedAt).reversed())
                .limit(RECENT_EVENT_LIMIT)
                .map(history -> {
                    TicketEntity ticket = ticketsById.get(history.getTicket().getId());
                    return new TicketAnalyticsStatusEvent(
                            history.getId(),
                            history.getTicket().getId(),
                            ticket != null ? ticket.getTicketCode() : null,
                            ticket != null ? ticket.getTitle() : null,
                            history.getOldStatus(),
                            history.getNewStatus(),
                            history.getChangedBy().getId(),
                            history.getChangedBy().getEmail(),
                            history.getNote(),
                            history.getChangedAt());
                })
                .toList();
    }

    private List<TicketAnalyticsManagerPerformance> buildManagerPerformance(
            List<TicketEntity> tickets,
            Map<UUID, List<TicketStatusHistoryEntity>> statusHistoryByTicket,
            List<TicketAssignmentHistoryEntity> assignmentHistory,
            Instant from,
            Instant to) {
        Map<UUID, List<TicketEntity>> ticketsByAssignee = tickets.stream()
                .filter(ticket -> ticket.getAssignedTo() != null)
                .collect(Collectors.groupingBy(ticket -> ticket.getAssignedTo().getId(), LinkedHashMap::new, Collectors.toList()));

        return ticketsByAssignee.values().stream()
                .map(assignedTickets -> buildManagerPerformanceRow(assignedTickets, statusHistoryByTicket, assignmentHistory, from, to))
                .sorted(Comparator.comparing(row -> Optional.ofNullable(row.assigneeName()).orElse(row.assigneeEmail())))
                .toList();
    }

    private TicketAnalyticsManagerPerformance buildManagerPerformanceRow(
            List<TicketEntity> assignedTickets,
            Map<UUID, List<TicketStatusHistoryEntity>> statusHistoryByTicket,
            List<TicketAssignmentHistoryEntity> assignmentHistory,
            Instant from,
            Instant to) {
        UserEntity assignee = assignedTickets.get(0).getAssignedTo();
        List<Long> acceptTimes = new ArrayList<>();
        List<Long> resolveTimes = new ArrayList<>();

        for (TicketEntity ticket : assignedTickets) {
            firstStatusAt(statusHistoryByTicket.getOrDefault(ticket.getId(), List.of()), TicketStatus.IN_PROGRESS)
                    .filter(value -> isWithin(value, from, to))
                    .ifPresent(value -> acceptTimes.add(minutesBetween(ticket.getCreatedAt(), value)));
            if (ticket.getResolvedAt() != null && isWithin(ticket.getResolvedAt(), from, to)) {
                resolveTimes.add(minutesBetween(ticket.getCreatedAt(), ticket.getResolvedAt()));
            }
        }

        long assignmentEvents = assignmentHistory.stream()
                .filter(history -> history.getNewAssignee() != null)
                .filter(history -> history.getNewAssignee().getId().equals(assignee.getId()))
                .filter(history -> isWithin(history.getChangedAt(), from, to))
                .count();
        long reassignmentEvents = assignmentHistory.stream()
                .filter(history -> history.getOldAssignee() != null)
                .filter(history -> history.getNewAssignee() != null)
                .filter(history -> history.getNewAssignee().getId().equals(assignee.getId()))
                .filter(history -> isWithin(history.getChangedAt(), from, to))
                .count();

        return new TicketAnalyticsManagerPerformance(
                assignee.getId(),
                resolveAssignedToName(assignee),
                assignee.getEmail(),
                assignedTickets.size(),
                assignedTickets.stream().filter(this::isActive).count(),
                assignedTickets.stream().filter(ticket -> ticket.getPriority() == TicketPriority.URGENT && isActive(ticket)).count(),
                assignedTickets.stream()
                        .filter(ticket -> ticket.getStatus() == TicketStatus.RESOLVED || ticket.getStatus() == TicketStatus.CLOSED)
                        .count(),
                assignedTickets.stream().filter(ticket -> ticket.getStatus() == TicketStatus.REJECTED).count(),
                average(acceptTimes),
                average(resolveTimes),
                assignmentEvents,
                reassignmentEvents);
    }

    private TicketAnalyticsSla buildSla(
            List<TicketEntity> tickets,
            Map<UUID, List<TicketStatusHistoryEntity>> statusHistoryByTicket) {
        List<TicketAnalyticsSlaRow> ttfrRows = new ArrayList<>();
        List<TicketAnalyticsSlaRow> ttrRows = new ArrayList<>();
        long ttfrTotal = 0;
        long ttfrCompliant = 0;
        long ttrTotal = 0;
        long ttrCompliant = 0;

        for (TicketPriority priority : TicketPriority.values()) {
            List<TicketEntity> byPriority = tickets.stream()
                    .filter(t -> t.getPriority() == priority)
                    .toList();

            long ttfrTargetMinutes = SlaTargets.TTFR.get(priority).toMinutes();
            long ttrTargetMinutes = SlaTargets.TTR.get(priority).toMinutes();

            long ttfrMeasured = 0;
            long ttfrMet = 0;
            long ttrMeasured = 0;
            long ttrMet = 0;

            for (TicketEntity ticket : byPriority) {
                List<TicketStatusHistoryEntity> history = statusHistoryByTicket.getOrDefault(ticket.getId(), List.of());

                Optional<Instant> acceptedAt = firstStatusAt(history, TicketStatus.IN_PROGRESS);
                if (acceptedAt.isPresent()) {
                    ttfrMeasured++;
                    if (minutesBetween(ticket.getCreatedAt(), acceptedAt.get()) <= ttfrTargetMinutes) {
                        ttfrMet++;
                    }
                }

                if (ticket.getResolvedAt() != null) {
                    ttrMeasured++;
                    if (minutesBetween(ticket.getCreatedAt(), ticket.getResolvedAt()) <= ttrTargetMinutes) {
                        ttrMet++;
                    }
                }
            }

            ttfrRows.add(new TicketAnalyticsSlaRow(
                    priority,
                    ttfrMeasured,
                    ttfrMet,
                    ttfrMeasured == 0 ? null : roundPercent(ttfrMet, ttfrMeasured),
                    ttfrTargetMinutes));

            ttrRows.add(new TicketAnalyticsSlaRow(
                    priority,
                    ttrMeasured,
                    ttrMet,
                    ttrMeasured == 0 ? null : roundPercent(ttrMet, ttrMeasured),
                    ttrTargetMinutes));

            ttfrTotal += ttfrMeasured;
            ttfrCompliant += ttfrMet;
            ttrTotal += ttrMeasured;
            ttrCompliant += ttrMet;
        }

        return new TicketAnalyticsSla(
                ttfrRows,
                ttrRows,
                ttfrTotal == 0 ? null : roundPercent(ttfrCompliant, ttfrTotal),
                ttrTotal == 0 ? null : roundPercent(ttrCompliant, ttrTotal));
    }

    private List<BucketWindow> bucketWindows(Instant from, Instant to, TicketAnalyticsBucket bucket) {
        List<BucketWindow> windows = new ArrayList<>();
        Instant cursor = bucketStart(from, bucket);

        while (!cursor.isAfter(to)) {
            Instant next = nextBucketStart(cursor, bucket);
            Instant end = next.minusMillis(1);
            if (end.isAfter(to)) {
                end = to;
            }
            windows.add(new BucketWindow(cursor, end));
            cursor = next;
        }

        return windows;
    }

    private Instant bucketStart(Instant value, TicketAnalyticsBucket bucket) {
        ZonedDateTime zoned = value.atZone(ZoneOffset.UTC);
        return switch (bucket) {
            case DAY -> zoned.truncatedTo(ChronoUnit.DAYS).toInstant();
            case WEEK -> {
                LocalDate date = zoned.toLocalDate();
                LocalDate monday = date.minusDays(date.getDayOfWeek().getValue() - 1L);
                yield monday.atStartOfDay(ZoneOffset.UTC).toInstant();
            }
            case MONTH -> LocalDate.of(zoned.getYear(), zoned.getMonth(), 1).atStartOfDay(ZoneOffset.UTC).toInstant();
        };
    }

    private Instant nextBucketStart(Instant value, TicketAnalyticsBucket bucket) {
        ZonedDateTime zoned = value.atZone(ZoneOffset.UTC);
        return switch (bucket) {
            case DAY -> zoned.plusDays(1).toInstant();
            case WEEK -> zoned.plusWeeks(1).toInstant();
            case MONTH -> zoned.plusMonths(1).toInstant();
        };
    }

    private boolean ticketWasActiveAtEndOfBucket(
            TicketEntity ticket,
            List<TicketStatusHistoryEntity> history,
            Instant bucketEnd) {
        if (ticket.getCreatedAt().isAfter(bucketEnd)) {
            return false;
        }

        Instant terminalAt = terminalAt(ticket, history);
        return terminalAt == null || terminalAt.isAfter(bucketEnd);
    }

    private Instant terminalAt(TicketEntity ticket, List<TicketStatusHistoryEntity> history) {
        List<Instant> terminalTimes = new ArrayList<>();
        history.stream()
                .filter(entry -> isTerminalStatus(entry.getNewStatus()))
                .map(TicketStatusHistoryEntity::getChangedAt)
                .forEach(terminalTimes::add);
        if (ticket.getResolvedAt() != null) {
            terminalTimes.add(ticket.getResolvedAt());
        }
        if (ticket.getClosedAt() != null) {
            terminalTimes.add(ticket.getClosedAt());
        }
        if (isTerminalStatus(ticket.getStatus()) && ticket.getUpdatedAt() != null) {
            terminalTimes.add(ticket.getUpdatedAt());
        }

        return terminalTimes.stream().filter(Objects::nonNull).min(Comparator.naturalOrder()).orElse(null);
    }

    private boolean hasPositiveOutcome(TicketEntity ticket) {
        return ticket.getStatus() == TicketStatus.RESOLVED || ticket.getStatus() == TicketStatus.CLOSED;
    }

    private Optional<Instant> positiveOutcomeAt(TicketEntity ticket) {
        if (ticket.getResolvedAt() != null) {
            return Optional.of(ticket.getResolvedAt());
        }
        return Optional.ofNullable(ticket.getClosedAt());
    }

    private Optional<Instant> firstStatusAt(List<TicketStatusHistoryEntity> history, TicketStatus status) {
        return history.stream()
                .filter(entry -> entry.getNewStatus() == status)
                .map(TicketStatusHistoryEntity::getChangedAt)
                .min(Comparator.naturalOrder());
    }

    private Optional<Instant> firstAssignmentAt(List<TicketAssignmentHistoryEntity> history) {
        return history.stream()
                .filter(entry -> entry.getNewAssignee() != null)
                .map(TicketAssignmentHistoryEntity::getChangedAt)
                .min(Comparator.naturalOrder());
    }

    private Map<UUID, Long> countMap(List<Object[]> rows) {
        Map<UUID, Long> counts = new HashMap<>();
        for (Object[] row : rows) {
            counts.put((UUID) row[0], ((Number) row[1]).longValue());
        }
        return counts;
    }

    private long minutesBetween(Instant start, Instant end) {
        if (start == null || end == null || end.isBefore(start)) {
            return 0;
        }
        return Duration.between(start, end).toMinutes();
    }

    private Double average(Collection<Long> values) {
        if (values.isEmpty()) {
            return null;
        }
        return Math.round(values.stream().mapToLong(Long::longValue).average().orElse(0) * 10.0) / 10.0;
    }

    private Double averagePerTicket(long value, int totalTickets) {
        if (totalTickets == 0) {
            return 0.0;
        }
        return Math.round((value / (double) totalTickets) * 10.0) / 10.0;
    }

    private Double percentage(long value, long total) {
        if (total == 0) {
            return 0.0;
        }
        return roundPercent(value, total);
    }

    private Double roundPercent(long value, long total) {
        return Math.round((value / (double) total) * 1000.0) / 10.0;
    }

    private boolean isWithin(Instant value, Instant from, Instant to) {
        return value != null && !value.isBefore(from) && !value.isAfter(to);
    }

    private boolean isActive(TicketEntity ticket) {
        return ticket.getStatus() == TicketStatus.OPEN || ticket.getStatus() == TicketStatus.IN_PROGRESS;
    }

    private boolean isTerminalStatus(TicketStatus status) {
        return status == TicketStatus.RESOLVED
                || status == TicketStatus.CLOSED
                || status == TicketStatus.REJECTED;
    }

    private String attentionReason(TicketEntity ticket, long ageMinutes, long staleMinutes) {
        if (ticket.getStatus() == TicketStatus.IN_PROGRESS && staleMinutes >= Duration.ofDays(3).toMinutes()) {
            return "No status movement for " + formatDurationMinutes(staleMinutes);
        }
        if (ticket.getPriority() == TicketPriority.URGENT && ageMinutes >= Duration.ofHours(24).toMinutes()) {
            return "Urgent active for " + formatDurationMinutes(ageMinutes);
        }
        if (ticket.getPriority() == TicketPriority.HIGH && ageMinutes >= Duration.ofHours(48).toMinutes()) {
            return "High priority active for " + formatDurationMinutes(ageMinutes);
        }
        if ((ticket.getPriority() == TicketPriority.MEDIUM || ticket.getPriority() == TicketPriority.LOW)
                && ageMinutes >= Duration.ofDays(5).toMinutes()) {
            return "Active for " + formatDurationMinutes(ageMinutes);
        }
        return null;
    }

    private String formatDurationMinutes(long minutes) {
        long days = minutes / (24 * 60);
        if (days > 0) {
            return days + (days == 1 ? " day" : " days");
        }
        long hours = Math.max(1, minutes / 60);
        return hours + (hours == 1 ? " hour" : " hours");
    }

    private int priorityRank(TicketPriority priority) {
        return switch (priority) {
            case URGENT -> 0;
            case HIGH -> 1;
            case MEDIUM -> 2;
            case LOW -> 3;
        };
    }

    private String statusLabel(TicketStatus status) {
        return switch (status) {
            case OPEN -> "Open";
            case IN_PROGRESS -> "In Progress";
            case RESOLVED -> "Resolved";
            case CLOSED -> "Closed";
            case REJECTED -> "Rejected";
        };
    }

    private String priorityLabel(TicketPriority priority) {
        return switch (priority) {
            case URGENT -> "Urgent";
            case HIGH -> "High";
            case MEDIUM -> "Medium";
            case LOW -> "Low";
        };
    }

    private String categoryLabel(TicketCategory category) {
        return switch (category) {
            case ELECTRICAL -> "Electrical";
            case NETWORK -> "Network";
            case EQUIPMENT -> "Equipment";
            case FURNITURE -> "Furniture";
            case CLEANLINESS -> "Cleanliness";
            case FACILITY_DAMAGE -> "Facility Damage";
            case ACCESS_SECURITY -> "Access / Security";
            case OTHER -> "Other";
        };
    }

    private boolean isAdmin(UserEntity user) {
        return user.getUserType() == UserType.ADMIN;
    }

    private boolean isTicketManager(UserEntity user) {
        return user.getUserType() == UserType.MANAGER
                && user.getManagerProfile() != null
                && user.getManagerProfile().getManagerRole() == ManagerRole.TICKET_MANAGER;
    }

    private String resolveAssignedToName(UserEntity user) {
        if (user == null) return null;
        if (isAdmin(user) && user.getAdminProfile() != null) {
            return user.getAdminProfile().getFullName();
        }
        if (isTicketManager(user) && user.getManagerProfile() != null) {
            if (user.getManagerProfile().getPreferredName() != null
                    && !user.getManagerProfile().getPreferredName().isBlank()) {
                return user.getManagerProfile().getPreferredName();
            }
            String first = user.getManagerProfile().getFirstName() != null ? user.getManagerProfile().getFirstName() : "";
            String last = user.getManagerProfile().getLastName() != null ? user.getManagerProfile().getLastName() : "";
            String full = (first + " " + last).trim();
            return full.isBlank() ? user.getEmail() : full;
        }
        return user.getEmail();
    }

}
