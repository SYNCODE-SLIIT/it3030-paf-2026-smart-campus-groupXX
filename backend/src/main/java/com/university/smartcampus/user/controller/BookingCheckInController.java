package com.university.smartcampus.user.controller;

import java.util.UUID;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.university.smartcampus.auth.service.CurrentUserService;
import com.university.smartcampus.booking.BookingCheckInService;
import com.university.smartcampus.booking.BookingDtos;
import com.university.smartcampus.user.entity.UserEntity;

@RestController
@RequestMapping("/api/bookings/{bookingId}/check-in")
public class BookingCheckInController {

    private final CurrentUserService currentUserService;
    private final BookingCheckInService checkInService;

    public BookingCheckInController(
        CurrentUserService currentUserService,
        BookingCheckInService checkInService
    ) {
        this.currentUserService = currentUserService;
        this.checkInService = checkInService;
    }

    @PostMapping
    public BookingDtos.CheckInResponse checkInBooking(
        @PathVariable UUID bookingId,
        Authentication authentication
    ) {
        UserEntity user = currentUserService.requireCurrentUser(authentication);
        return checkInService.checkInBooking(user, bookingId);
    }

    @GetMapping
    public BookingDtos.CheckInResponse getCheckInStatus(@PathVariable UUID bookingId) {
        return checkInService.getCheckInStatus(bookingId);
    }
}

@RestController
@RequestMapping("/api/admin/bookings/{bookingId}")
class AdminBookingCheckInController {

    private final CurrentUserService currentUserService;
    private final BookingCheckInService checkInService;

    public AdminBookingCheckInController(
        CurrentUserService currentUserService,
        BookingCheckInService checkInService
    ) {
        this.currentUserService = currentUserService;
        this.checkInService = checkInService;
    }

    @PostMapping("/mark-no-show")
    public BookingDtos.CheckInResponse markNoShow(
        @PathVariable UUID bookingId,
        Authentication authentication
    ) {
        currentUserService.requireAdminOrBookingManager(authentication);
        return checkInService.markNoShow(bookingId);
    }

    @PostMapping("/complete")
    public BookingDtos.CheckInResponse completeBooking(
        @PathVariable UUID bookingId,
        Authentication authentication
    ) {
        currentUserService.requireAdminOrBookingManager(authentication);
        return checkInService.completeBooking(bookingId);
    }
}
