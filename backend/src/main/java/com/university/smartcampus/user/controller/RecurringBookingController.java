package com.university.smartcampus.user.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.university.smartcampus.auth.service.CurrentUserService;
import com.university.smartcampus.booking.BookingDtos;
import com.university.smartcampus.booking.RecurringBookingService;
import com.university.smartcampus.user.entity.UserEntity;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/recurring-bookings")
public class RecurringBookingController {

    private final CurrentUserService currentUserService;
    private final RecurringBookingService recurringBookingService;

    public RecurringBookingController(
        CurrentUserService currentUserService,
        RecurringBookingService recurringBookingService
    ) {
        this.currentUserService = currentUserService;
        this.recurringBookingService = recurringBookingService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BookingDtos.RecurringBookingResponse createRecurringBooking(
        @Valid @RequestBody BookingDtos.CreateRecurringBookingRequest request,
        Authentication authentication
    ) {
        UserEntity user = currentUserService.requireCurrentUser(authentication);
        return recurringBookingService.createRecurringBooking(user, request);
    }

    @GetMapping
    public List<BookingDtos.RecurringBookingResponse> listMyRecurringBookings(Authentication authentication) {
        UserEntity user = currentUserService.requireCurrentUser(authentication);
        return recurringBookingService.listRecurringBookings(user);
    }

    @GetMapping("/{id}")
    public BookingDtos.RecurringBookingResponse getRecurringBooking(
        @PathVariable UUID id,
        Authentication authentication
    ) {
        UserEntity user = currentUserService.requireCurrentUser(authentication);
        return recurringBookingService.getRecurringBooking(user, id);
    }

    @DeleteMapping("/{id}")
    public BookingDtos.RecurringBookingResponse deactivateRecurringBooking(
        @PathVariable UUID id,
        Authentication authentication
    ) {
        UserEntity user = currentUserService.requireCurrentUser(authentication);
        return recurringBookingService.deactivateRecurringBooking(user, id);
    }
}
