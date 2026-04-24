package com.university.smartcampus.booking;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.university.smartcampus.AppEnums.BookingStatus;
import com.university.smartcampus.AppEnums.ModificationStatus;
import com.university.smartcampus.AppEnums.ResourceCategory;

@Service
public class BookingAnalyticsService {

    private static final Duration DEFAULT_RANGE = Duration.ofDays(30);
    private static final Duration STALE_PENDING_THRESHOLD = Duration.ofHours(24);
    private static final List<BookingStatus> STATUS_ORDER = List.of(
        BookingStatus.PENDING,
        BookingStatus.APPROVED,
        BookingStatus.CHECKED_IN,
        BookingStatus.COMPLETED,
        BookingStatus.REJECTED,
        BookingStatus.CANCELLED,
        BookingStatus.NO_SHOW
    );
    private static final List<DayOfWeek> DAY_ORDER = List.of(
        DayOfWeek.MONDAY,
        DayOfWeek.TUESDAY,
        DayOfWeek.WEDNESDAY,
        DayOfWeek.THURSDAY,
        DayOfWeek.FRIDAY,
        DayOfWeek.SATURDAY,
        DayOfWeek.SUNDAY
    );

    private final BookingRepository bookingRepository;
    private final BookingModificationRepository bookingModificationRepository;
    private final BookingValidator bookingValidator;

    public BookingAnalyticsService(
        BookingRepository bookingRepository,
        BookingModificationRepository bookingModificationRepository,
        BookingValidator bookingValidator
    ) {
        this.bookingRepository = bookingRepository;
        this.bookingModificationRepository = bookingModificationRepository;
        this.bookingValidator = bookingValidator;
    }

    @Transactional(readOnly = true)
    public BookingDtos.BookingAnalyticsResponse getAnalytics(
        Instant requestedFrom,
        Instant requestedTo,
        BookingDtos.BookingAnalyticsBucket requestedBucket,
        ResourceCategory category,
        UUID resourceId
    ) {
        Instant now = bookingValidator.currentInstant();
        Instant to = requestedTo != null ? requestedTo : now;
        Instant from = requestedFrom != null ? requestedFrom : to.minus(DEFAULT_RANGE);

        if (from.isAfter(to)) {
            throw new com.university.smartcampus.common.exception.BadRequestException(
                "Analytics start date must be before the end date."
            );
        }

        BookingDtos.BookingAnalyticsBucket bucket = requestedBucket != null
            ? requestedBucket
            : BookingDtos.BookingAnalyticsBucket.DAY;

        List<BookingEntity> scopedBookings = bookingRepository.findAllByOrderByStartTimeDesc().stream()
            .filter((booking) -> matchesScope(booking, category, resourceId))
            .toList();

        List<BookingEntity> windowBookings = scopedBookings.stream()
            .filter((booking) -> isWithin(booking.getStartTime(), from, to))
            .toList();

        List<BookingModificationEntity> pendingModifications = bookingModificationRepository
            .findByStatusOrderByCreatedAtDesc(ModificationStatus.PENDING).stream()
            .filter((modification) -> matchesScope(modification.getBooking(), category, resourceId))
            .toList();

        return new BookingDtos.BookingAnalyticsResponse(
            from,
            to,
            bucket,
            buildLiveQueue(scopedBookings, pendingModifications, now),
            buildWindowSummary(windowBookings),
            buildStatusBreakdown(windowBookings),
            buildCategoryBreakdown(windowBookings),
            buildTopResources(windowBookings),
            buildTrends(windowBookings, from, to, bucket),
            buildUtilizationHeatmap(windowBookings)
        );
    }

    private BookingDtos.BookingAnalyticsLiveQueue buildLiveQueue(
        List<BookingEntity> scopedBookings,
        List<BookingModificationEntity> pendingModifications,
        Instant now
    ) {
        Instant staleThreshold = now.minus(STALE_PENDING_THRESHOLD);
        long pendingApprovals = scopedBookings.stream()
            .filter((booking) -> booking.getStatus() == BookingStatus.PENDING)
            .count();
        long stalePendingApprovals = scopedBookings.stream()
            .filter((booking) -> booking.getStatus() == BookingStatus.PENDING)
            .filter((booking) -> booking.getCreatedAt() != null && !booking.getCreatedAt().isAfter(staleThreshold))
            .count();

        return new BookingDtos.BookingAnalyticsLiveQueue(
            pendingApprovals,
            stalePendingApprovals,
            pendingModifications.size()
        );
    }

    private BookingDtos.BookingAnalyticsWindowSummary buildWindowSummary(List<BookingEntity> windowBookings) {
        long totalScheduled = windowBookings.size();
        long approved = windowBookings.stream().filter((booking) -> booking.getStatus() == BookingStatus.APPROVED).count();
        long attended = windowBookings.stream().filter(this::isAttended).count();
        long noShow = windowBookings.stream().filter((booking) -> booking.getStatus() == BookingStatus.NO_SHOW).count();
        long rejected = windowBookings.stream().filter((booking) -> booking.getStatus() == BookingStatus.REJECTED).count();
        long cancelled = windowBookings.stream().filter((booking) -> booking.getStatus() == BookingStatus.CANCELLED).count();
        double hoursBooked = windowBookings.stream().mapToDouble(this::durationHours).sum();

        return new BookingDtos.BookingAnalyticsWindowSummary(
            totalScheduled,
            approved,
            attended,
            noShow,
            rejected,
            cancelled,
            toRate(approved, approved + rejected),
            toRate(attended, attended + noShow),
            toRate(noShow, attended + noShow),
            round(hoursBooked)
        );
    }

    private List<BookingDtos.BookingAnalyticsBreakdownRow> buildStatusBreakdown(List<BookingEntity> windowBookings) {
        long total = windowBookings.size();
        Map<BookingStatus, Long> counts = new EnumMap<>(BookingStatus.class);
        for (BookingStatus status : STATUS_ORDER) {
            counts.put(status, 0L);
        }
        for (BookingEntity booking : windowBookings) {
            counts.computeIfPresent(booking.getStatus(), (status, count) -> count + 1);
        }

        List<BookingDtos.BookingAnalyticsBreakdownRow> rows = new ArrayList<>();
        for (BookingStatus status : STATUS_ORDER) {
            long count = counts.getOrDefault(status, 0L);
            rows.add(new BookingDtos.BookingAnalyticsBreakdownRow(
                status.name(),
                statusLabel(status),
                count,
                total == 0 ? 0.0 : round((count * 100.0) / total)
            ));
        }
        return rows;
    }

    private List<BookingDtos.BookingAnalyticsBreakdownRow> buildCategoryBreakdown(List<BookingEntity> windowBookings) {
        long total = windowBookings.size();
        Map<ResourceCategory, Long> counts = new EnumMap<>(ResourceCategory.class);

        for (BookingEntity booking : windowBookings) {
            ResourceCategory category = booking.getResource().getCategory();
            counts.put(category, counts.getOrDefault(category, 0L) + 1);
        }

        return counts.entrySet().stream()
            .sorted((left, right) -> {
                int byCount = Long.compare(right.getValue(), left.getValue());
                return byCount != 0 ? byCount : left.getKey().name().compareTo(right.getKey().name());
            })
            .map((entry) -> new BookingDtos.BookingAnalyticsBreakdownRow(
                entry.getKey().name(),
                categoryLabel(entry.getKey()),
                entry.getValue(),
                total == 0 ? 0.0 : round((entry.getValue() * 100.0) / total)
            ))
            .toList();
    }

    private List<BookingDtos.BookingAnalyticsTopResource> buildTopResources(List<BookingEntity> windowBookings) {
        Map<UUID, ResourceAggregate> aggregates = new LinkedHashMap<>();

        for (BookingEntity booking : windowBookings) {
            UUID resourceId = booking.getResource().getId();
            ResourceAggregate aggregate = aggregates.computeIfAbsent(
                resourceId,
                (id) -> new ResourceAggregate(
                    resourceId,
                    booking.getResource().getCode(),
                    booking.getResource().getName(),
                    booking.getResource().getCategory()
                )
            );
            aggregate.bookingCount += 1;
            aggregate.hoursBooked += durationHours(booking);
            if (booking.getStatus() == BookingStatus.NO_SHOW) {
                aggregate.noShowCount += 1;
            }
        }

        return aggregates.values().stream()
            .sorted((left, right) -> {
                int byCount = Long.compare(right.bookingCount, left.bookingCount);
                if (byCount != 0) {
                    return byCount;
                }
                int byHours = Double.compare(right.hoursBooked, left.hoursBooked);
                if (byHours != 0) {
                    return byHours;
                }
                return left.name.compareToIgnoreCase(right.name);
            })
            .limit(8)
            .map((aggregate) -> new BookingDtos.BookingAnalyticsTopResource(
                aggregate.resourceId,
                aggregate.code,
                aggregate.name,
                aggregate.category,
                aggregate.bookingCount,
                round(aggregate.hoursBooked),
                aggregate.noShowCount
            ))
            .toList();
    }

    private List<BookingDtos.BookingAnalyticsTrendPoint> buildTrends(
        List<BookingEntity> windowBookings,
        Instant from,
        Instant to,
        BookingDtos.BookingAnalyticsBucket bucket
    ) {
        ZoneId zoneId = bookingValidator.bookingZoneId();
        List<BookingDtos.BookingAnalyticsTrendPoint> trends = new ArrayList<>();

        ZonedDateTime cursor = floorToBucket(from, bucket, zoneId);
        while (!cursor.toInstant().isAfter(to)) {
            ZonedDateTime next = nextBucket(cursor, bucket);
            Instant bucketStart = cursor.toInstant();
            Instant bucketEnd = next.toInstant();
            List<BookingEntity> bucketBookings = windowBookings.stream()
                .filter((booking) -> !booking.getStartTime().isBefore(bucketStart))
                .filter((booking) -> booking.getStartTime().isBefore(bucketEnd))
                .toList();

            trends.add(new BookingDtos.BookingAnalyticsTrendPoint(
                bucketStart,
                bucketEnd,
                bucketBookings.size(),
                bucketBookings.stream().filter((booking) -> booking.getStatus() == BookingStatus.APPROVED).count(),
                bucketBookings.stream().filter(this::isAttended).count(),
                bucketBookings.stream().filter((booking) -> booking.getStatus() == BookingStatus.NO_SHOW).count(),
                bucketBookings.stream().filter((booking) -> booking.getStatus() == BookingStatus.CANCELLED).count()
            ));
            cursor = next;
        }

        return trends;
    }

    private List<BookingDtos.BookingAnalyticsHeatmapCell> buildUtilizationHeatmap(List<BookingEntity> windowBookings) {
        Map<String, HeatmapAccumulator> cells = new LinkedHashMap<>();
        for (DayOfWeek dayOfWeek : DAY_ORDER) {
            for (int hour = 0; hour < 24; hour += 1) {
                cells.put(heatmapKey(dayOfWeek, hour), new HeatmapAccumulator(dayOfWeek, hour));
            }
        }

        ZoneId zoneId = bookingValidator.bookingZoneId();
        for (BookingEntity booking : windowBookings) {
            ZonedDateTime start = booking.getStartTime().atZone(zoneId);
            ZonedDateTime end = booking.getEndTime().atZone(zoneId);
            ZonedDateTime slotStart = start.truncatedTo(ChronoUnit.HOURS);

            while (slotStart.isBefore(end)) {
                ZonedDateTime slotEnd = slotStart.plusHours(1);
                ZonedDateTime overlapStart = start.isAfter(slotStart) ? start : slotStart;
                ZonedDateTime overlapEnd = end.isBefore(slotEnd) ? end : slotEnd;

                if (overlapStart.isBefore(overlapEnd)) {
                    String key = heatmapKey(slotStart.getDayOfWeek(), slotStart.getHour());
                    HeatmapAccumulator cell = cells.get(key);
                    if (cell != null) {
                        cell.bookingCount += 1;
                        cell.hoursBooked += Duration.between(overlapStart, overlapEnd).toMinutes() / 60.0;
                    }
                }

                slotStart = slotEnd;
            }
        }

        return cells.values().stream()
            .map((cell) -> new BookingDtos.BookingAnalyticsHeatmapCell(
                cell.dayOfWeek.name(),
                cell.hourOfDay,
                cell.bookingCount,
                round(cell.hoursBooked)
            ))
            .toList();
    }

    private boolean matchesScope(BookingEntity booking, ResourceCategory category, UUID resourceId) {
        Objects.requireNonNull(booking, "Booking is required.");
        if (resourceId != null && !resourceId.equals(booking.getResource().getId())) {
            return false;
        }
        return category == null || booking.getResource().getCategory() == category;
    }

    private boolean isWithin(Instant instant, Instant from, Instant to) {
        return instant != null && !instant.isBefore(from) && !instant.isAfter(to);
    }

    private boolean isAttended(BookingEntity booking) {
        return booking.getStatus() == BookingStatus.CHECKED_IN || booking.getStatus() == BookingStatus.COMPLETED;
    }

    private double durationHours(BookingEntity booking) {
        return Duration.between(booking.getStartTime(), booking.getEndTime()).toMinutes() / 60.0;
    }

    private Double toRate(long numerator, long denominator) {
        if (denominator <= 0) {
            return null;
        }
        return round((numerator * 100.0) / denominator);
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private ZonedDateTime floorToBucket(Instant instant, BookingDtos.BookingAnalyticsBucket bucket, ZoneId zoneId) {
        ZonedDateTime zoned = instant.atZone(zoneId);
        return switch (bucket) {
            case DAY -> zoned.toLocalDate().atStartOfDay(zoneId);
            case WEEK -> zoned.toLocalDate()
                .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
                .atStartOfDay(zoneId);
            case MONTH -> zoned.toLocalDate().withDayOfMonth(1).atStartOfDay(zoneId);
        };
    }

    private ZonedDateTime nextBucket(ZonedDateTime cursor, BookingDtos.BookingAnalyticsBucket bucket) {
        return switch (bucket) {
            case DAY -> cursor.plusDays(1);
            case WEEK -> cursor.plusWeeks(1);
            case MONTH -> cursor.plusMonths(1);
        };
    }

    private String heatmapKey(DayOfWeek dayOfWeek, int hour) {
        return dayOfWeek.name() + "|" + hour;
    }

    private String statusLabel(BookingStatus status) {
        return switch (status) {
            case PENDING -> "Pending";
            case APPROVED -> "Approved";
            case CHECKED_IN -> "Checked In";
            case COMPLETED -> "Completed";
            case REJECTED -> "Rejected";
            case CANCELLED -> "Cancelled";
            case NO_SHOW -> "No Show";
        };
    }

    private String categoryLabel(ResourceCategory category) {
        return switch (category) {
            case SPACES -> "Spaces";
            case TECHNICAL_EQUIPMENT -> "Technical Equipment";
            case MAINTENANCE_AND_CLEANING -> "Maintenance & Cleaning";
            case SPORTS -> "Sports";
            case EVENT_AND_DECORATION -> "Event & Decoration";
            case GENERAL_UTILITY -> "General Utility";
            case TRANSPORT_AND_LOGISTICS -> "Transport & Logistics";
        };
    }

    private static final class ResourceAggregate {
        private final UUID resourceId;
        private final String code;
        private final String name;
        private final ResourceCategory category;
        private long bookingCount;
        private double hoursBooked;
        private long noShowCount;

        private ResourceAggregate(UUID resourceId, String code, String name, ResourceCategory category) {
            this.resourceId = resourceId;
            this.code = code;
            this.name = name;
            this.category = category;
        }
    }

    private static final class HeatmapAccumulator {
        private final DayOfWeek dayOfWeek;
        private final int hourOfDay;
        private long bookingCount;
        private double hoursBooked;

        private HeatmapAccumulator(DayOfWeek dayOfWeek, int hourOfDay) {
            this.dayOfWeek = dayOfWeek;
            this.hourOfDay = hourOfDay;
        }
    }
}
