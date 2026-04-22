package com.university.smartcampus.user.controller;

import java.util.List;
import java.time.LocalDate;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.university.smartcampus.auth.service.CurrentUserService;
import com.university.smartcampus.booking.BookingDtos.BookingResponse;
import com.university.smartcampus.booking.BookingDtos.CancelBookingRequest;
import com.university.smartcampus.booking.BookingDtos.CreateBookingRequest;
import com.university.smartcampus.booking.BookingDtos.ResourceRemainingRangesResponse;
import com.university.smartcampus.booking.BookingService;
import com.university.smartcampus.user.entity.UserEntity;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final CurrentUserService currentUserService;
    private final BookingService bookingService;

    public BookingController(CurrentUserService currentUserService, BookingService bookingService) {
        this.currentUserService = currentUserService;
        this.bookingService = bookingService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BookingResponse createBooking(@Valid @RequestBody CreateBookingRequest request, Authentication authentication) {
        UserEntity user = currentUserService.requireCurrentUserWithCompletedOnboarding(authentication);
        return bookingService.createBooking(user, request);
    }

    @GetMapping
    public List<BookingResponse> listBookings(Authentication authentication) {
        UserEntity user = currentUserService.requireCurrentUserWithCompletedOnboarding(authentication);
        return bookingService.listBookingsForUser(user);
    }

    @GetMapping("/{id}")
    public BookingResponse getBooking(@PathVariable UUID id, Authentication authentication) {
        UserEntity user = currentUserService.requireCurrentUserWithCompletedOnboarding(authentication);
        return bookingService.getBookingForUser(user, id);
    }

    @GetMapping("/resources/{resourceId}/remaining-ranges")
    public ResourceRemainingRangesResponse getRemainingRanges(
        @PathVariable UUID resourceId,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
        Authentication authentication
    ) {
        currentUserService.requireCurrentUserWithCompletedOnboarding(authentication);
        return bookingService.getRemainingRangesForResource(resourceId, date);
    }

    @PostMapping("/{id}/cancel")
    public BookingResponse cancelBooking(
        @PathVariable UUID id,
        @RequestBody(required = false) CancelBookingRequest request,
        Authentication authentication
    ) {
        UserEntity user = currentUserService.requireCurrentUserWithCompletedOnboarding(authentication);
        return bookingService.cancelBooking(user, id, request);
    }
}
