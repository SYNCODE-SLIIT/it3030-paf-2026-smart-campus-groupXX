package com.university.smartcampus.user.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.university.smartcampus.auth.service.CurrentUserService;
import com.university.smartcampus.booking.BookingDtos;
import com.university.smartcampus.booking.BookingModificationService;
import com.university.smartcampus.user.entity.UserEntity;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/bookings/{bookingId}/modifications")
public class BookingModificationController {

    private final CurrentUserService currentUserService;
    private final BookingModificationService modificationService;

    public BookingModificationController(
        CurrentUserService currentUserService,
        BookingModificationService modificationService
    ) {
        this.currentUserService = currentUserService;
        this.modificationService = modificationService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BookingDtos.BookingModificationResponse requestModification(
        @PathVariable UUID bookingId,
        @Valid @RequestBody BookingDtos.RequestModificationRequest request,
        Authentication authentication
    ) {
        UserEntity user = currentUserService.requireCurrentUser(authentication);
        return modificationService.requestModification(user, bookingId, request);
    }

    @GetMapping
    public List<BookingDtos.BookingModificationResponse> listModificationsForBooking(
        @PathVariable UUID bookingId
    ) {
        return modificationService.listModificationsForBooking(bookingId);
    }
}

@RestController
@RequestMapping("/api/admin/modifications")
class AdminBookingModificationController {

    private final CurrentUserService currentUserService;
    private final BookingModificationService modificationService;

    public AdminBookingModificationController(
        CurrentUserService currentUserService,
        BookingModificationService modificationService
    ) {
        this.currentUserService = currentUserService;
        this.modificationService = modificationService;
    }

    @GetMapping("/pending")
    public List<BookingDtos.BookingModificationResponse> listPendingModifications(Authentication authentication) {
        currentUserService.requireAdminOrBookingManager(authentication);
        return modificationService.listPendingModifications();
    }

    @PostMapping("/{modificationId}/approve")
    public BookingDtos.BookingModificationResponse approveModification(
        @PathVariable UUID modificationId,
        @RequestBody(required = false) BookingDtos.ModificationDecisionRequest request,
        Authentication authentication
    ) {
        UserEntity approver = currentUserService.requireAdminOrBookingManager(authentication);
        return modificationService.approveModification(approver, modificationId, request);
    }

    @PostMapping("/{modificationId}/reject")
    public BookingDtos.BookingModificationResponse rejectModification(
        @PathVariable UUID modificationId,
        @RequestBody(required = false) BookingDtos.ModificationDecisionRequest request,
        Authentication authentication
    ) {
        UserEntity rejecter = currentUserService.requireAdminOrBookingManager(authentication);
        return modificationService.rejectModification(rejecter, modificationId, request);
    }
}
