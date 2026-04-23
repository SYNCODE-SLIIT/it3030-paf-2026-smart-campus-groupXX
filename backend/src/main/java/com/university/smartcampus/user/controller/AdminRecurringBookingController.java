package com.university.smartcampus.user.controller;

import java.util.UUID;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.university.smartcampus.auth.service.CurrentUserService;
import com.university.smartcampus.booking.BookingDtos;
import com.university.smartcampus.booking.RecurringBookingService;
import com.university.smartcampus.user.entity.UserEntity;

@RestController
@RequestMapping("/api/admin/recurring-bookings")
public class AdminRecurringBookingController {

    private final CurrentUserService currentUserService;
    private final RecurringBookingService recurringBookingService;

    public AdminRecurringBookingController(
        CurrentUserService currentUserService,
        RecurringBookingService recurringBookingService
    ) {
        this.currentUserService = currentUserService;
        this.recurringBookingService = recurringBookingService;
    }

    @PostMapping("/{id}/approve-pending")
    public BookingDtos.RecurringBookingResponse approvePendingOccurrences(
        @PathVariable UUID id,
        Authentication authentication
    ) {
        UserEntity actor = currentUserService.requireAdminOrBookingManager(authentication);
        return recurringBookingService.approvePendingOccurrences(id, actor);
    }

    @PostMapping("/{id}/cancel-future")
    public BookingDtos.RecurringBookingResponse cancelFutureOccurrences(
        @PathVariable UUID id,
        @RequestBody(required = false) BookingDtos.CancelBookingRequest request,
        Authentication authentication
    ) {
        UserEntity actor = currentUserService.requireAdminOrBookingManager(authentication);
        return recurringBookingService.cancelFutureOccurrences(id, actor, request);
    }
}
