package com.university.smartcampus.user.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.university.smartcampus.AppEnums.ResourceCategory;
import com.university.smartcampus.booking.BookingAnalyticsService;
import com.university.smartcampus.auth.service.CurrentUserService;
import com.university.smartcampus.booking.BookingDecisionService;
import com.university.smartcampus.booking.BookingDtos.BookingAnalyticsBucket;
import com.university.smartcampus.booking.BookingDtos.BookingAnalyticsResponse;
import com.university.smartcampus.booking.BookingDtos.BookingDecisionRequest;
import com.university.smartcampus.booking.BookingDtos.BookingResponse;
import com.university.smartcampus.booking.BookingDtos.CancelBookingRequest;
import com.university.smartcampus.booking.BookingService;
import com.university.smartcampus.user.entity.UserEntity;

import jakarta.validation.Valid;
import java.time.Instant;

@RestController
@RequestMapping("/api/admin/bookings")
public class AdminBookingController {

    private final CurrentUserService currentUserService;
    private final BookingService bookingService;
    private final BookingDecisionService bookingDecisionService;
    private final BookingAnalyticsService bookingAnalyticsService;

    public AdminBookingController(
        CurrentUserService currentUserService,
        BookingService bookingService,
        BookingDecisionService bookingDecisionService,
        BookingAnalyticsService bookingAnalyticsService
    ) {
        this.currentUserService = currentUserService;
        this.bookingService = bookingService;
        this.bookingDecisionService = bookingDecisionService;
        this.bookingAnalyticsService = bookingAnalyticsService;
    }

    @GetMapping
    public List<BookingResponse> listBookings(Authentication authentication) {
        currentUserService.requireAdminOrBookingManager(authentication);
        return bookingService.listAllBookings();
    }

    @GetMapping("/analytics")
    public BookingAnalyticsResponse getAnalytics(
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
        @RequestParam(required = false) BookingAnalyticsBucket bucket,
        @RequestParam(required = false) ResourceCategory category,
        @RequestParam(required = false) UUID resourceId,
        Authentication authentication
    ) {
        currentUserService.requireAdminOrBookingManager(authentication);
        return bookingAnalyticsService.getAnalytics(from, to, bucket, category, resourceId);
    }

    @PostMapping("/{id}/approve")
    public BookingResponse approveBooking(@PathVariable UUID id, Authentication authentication) {
        UserEntity approver = currentUserService.requireAdminOrBookingManager(authentication);
        return bookingDecisionService.approveBooking(id, approver);
    }

    @PostMapping("/{id}/reject")
    public BookingResponse rejectBooking(
        @PathVariable UUID id,
        @Valid @RequestBody BookingDecisionRequest request,
        Authentication authentication
    ) {
        UserEntity approver = currentUserService.requireAdminOrBookingManager(authentication);
        return bookingDecisionService.rejectBooking(id, approver, request);
    }

    @PostMapping("/{id}/cancel")
    public BookingResponse cancelBooking(
        @PathVariable UUID id,
        @RequestBody(required = false) CancelBookingRequest request,
        Authentication authentication
    ) {
        UserEntity actor = currentUserService.requireAdminOrBookingManager(authentication);
        return bookingDecisionService.cancelApprovedBooking(id, actor, request);
    }
}
