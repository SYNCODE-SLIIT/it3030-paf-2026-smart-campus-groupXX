package com.university.smartcampus.ticket.service;

import java.time.Duration;
import java.util.Map;

import com.university.smartcampus.common.enums.AppEnums.TicketPriority;

final class SlaTargets {

    static final Map<TicketPriority, Duration> TTFR = Map.of(
            TicketPriority.URGENT, Duration.ofHours(2),
            TicketPriority.HIGH,   Duration.ofHours(4),
            TicketPriority.MEDIUM, Duration.ofHours(8),
            TicketPriority.LOW,    Duration.ofHours(24));

    static final Map<TicketPriority, Duration> TTR = Map.of(
            TicketPriority.URGENT, Duration.ofHours(24),
            TicketPriority.HIGH,   Duration.ofHours(48),
            TicketPriority.MEDIUM, Duration.ofDays(5),
            TicketPriority.LOW,    Duration.ofDays(7));

    private SlaTargets() {
    }
}
