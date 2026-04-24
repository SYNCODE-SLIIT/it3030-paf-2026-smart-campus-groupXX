package com.university.smartcampus.booking;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.university.smartcampus.AppEnums.BookingStatus;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.EntityGraph;

public interface BookingRepository extends JpaRepository<BookingEntity, UUID>, JpaSpecificationExecutor<BookingEntity> {

    long countByStatus(BookingStatus status);

    boolean existsByResourceIdAndStatusInAndStartTimeLessThanAndEndTimeGreaterThan(
        UUID resourceId,
        List<BookingStatus> statuses,
        Instant endTime,
        Instant startTime
    );

    boolean existsByResourceIdAndStatusInAndStartTimeLessThanAndEndTimeGreaterThanAndIdNot(
        UUID resourceId,
        List<BookingStatus> statuses,
        Instant endTime,
        Instant startTime,
        UUID id
    );

    @EntityGraph(attributePaths = { "resource", "requester", "requester.studentProfile", "requester.facultyProfile", "recurringBooking" })
    List<BookingEntity> findAllByRequesterIdOrderByStartTimeDesc(UUID requesterId);

    @EntityGraph(attributePaths = { "resource", "requester", "requester.studentProfile", "requester.facultyProfile", "recurringBooking" })
    List<BookingEntity> findAllByOrderByStartTimeDesc();

    @EntityGraph(attributePaths = { "resource", "requester", "requester.studentProfile", "requester.facultyProfile", "recurringBooking" })
    List<BookingEntity> findAllByResourceIdAndStatusInAndStartTimeLessThanAndEndTimeGreaterThanOrderByStartTimeAsc(
        UUID resourceId,
        List<BookingStatus> statuses,
        Instant endTime,
        Instant startTime
    );

    @EntityGraph(attributePaths = { "resource", "requester", "requester.studentProfile", "requester.facultyProfile", "recurringBooking" })
    List<BookingEntity> findAllByResourceIdAndStatusInAndStartTimeAfterOrderByStartTimeAsc(
        UUID resourceId,
        List<BookingStatus> statuses,
        Instant startTime
    );

    @EntityGraph(attributePaths = { "resource", "requester", "requester.studentProfile", "requester.facultyProfile", "recurringBooking" })
    List<BookingEntity> findAllByStatusAndStartTimeBetweenOrderByStartTimeAsc(
        BookingStatus status,
        Instant startTime,
        Instant endTime
    );

    @EntityGraph(attributePaths = { "resource", "requester", "requester.studentProfile", "requester.facultyProfile", "recurringBooking" })
    List<BookingEntity> findAllByStatusAndEndTimeLessThanEqualOrderByEndTimeAsc(
        BookingStatus status,
        Instant endTime
    );

    @EntityGraph(attributePaths = { "resource", "requester", "requester.studentProfile", "requester.facultyProfile", "recurringBooking" })
    List<BookingEntity> findAllByRecurringBookingIdOrderByStartTimeAsc(UUID recurringBookingId);

    @Override
    @EntityGraph(attributePaths = { "resource", "requester", "requester.studentProfile", "requester.facultyProfile", "recurringBooking" })
    java.util.Optional<BookingEntity> findById(UUID id);

}
