package com.university.smartcampus.ticket.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.university.smartcampus.auth.service.CurrentUserService;
import com.university.smartcampus.common.enums.AppEnums.TicketCategory;
import com.university.smartcampus.common.enums.AppEnums.TicketPriority;
import com.university.smartcampus.common.enums.AppEnums.TicketStatus;
import com.university.smartcampus.ticket.dto.TicketDtos.AddCommentRequest;
import com.university.smartcampus.ticket.dto.TicketDtos.AddTicketAttachmentRequest;
import com.university.smartcampus.ticket.dto.TicketDtos.AssignTicketRequest;
import com.university.smartcampus.ticket.dto.TicketDtos.CreateTicketRequest;
import com.university.smartcampus.ticket.dto.TicketDtos.TicketAttachmentResponse;
import com.university.smartcampus.ticket.dto.TicketDtos.TicketCommentResponse;
import com.university.smartcampus.ticket.dto.TicketDtos.TicketResponse;
import com.university.smartcampus.ticket.dto.TicketDtos.TicketStatusHistoryResponse;
import com.university.smartcampus.ticket.dto.TicketDtos.TicketStatusUpdateRequest;
import com.university.smartcampus.ticket.dto.TicketDtos.TicketSummaryResponse;
import com.university.smartcampus.ticket.dto.TicketDtos.UpdateTicketRequest;
import com.university.smartcampus.ticket.service.TicketService;
import com.university.smartcampus.user.entity.UserEntity;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/tickets")
public class TicketController {

    private final CurrentUserService currentUserService;
    private final TicketService ticketService;

    public TicketController(CurrentUserService currentUserService, TicketService ticketService) {
        this.currentUserService = currentUserService;
        this.ticketService = ticketService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TicketResponse createTicket(
            @Valid @RequestBody CreateTicketRequest request,
            Authentication authentication) {
        UserEntity user = currentUserService.requireCurrentUserWithCompletedOnboarding(authentication);
        return ticketService.createTicket(user, request);
    }

    @GetMapping
    public List<TicketSummaryResponse> listTickets(
            @RequestParam(required = false) TicketStatus status,
            @RequestParam(required = false) TicketCategory category,
            @RequestParam(required = false) TicketPriority priority,
            Authentication authentication) {
        UserEntity user = currentUserService.requireCurrentUserWithCompletedOnboarding(authentication);
        return ticketService.listTickets(user, status, category, priority);
    }

    @GetMapping("/{ticketRef}")
    public TicketResponse getTicket(@PathVariable String ticketRef, Authentication authentication) {
        UserEntity user = currentUserService.requireCurrentUserWithCompletedOnboarding(authentication);
        return ticketService.getTicket(user, ticketRef);
    }

    @PatchMapping("/{ticketRef}")
    public TicketResponse updateTicket(
            @PathVariable String ticketRef,
            @Valid @RequestBody UpdateTicketRequest request,
            Authentication authentication) {
        UserEntity user = currentUserService.requireCurrentUserWithCompletedOnboarding(authentication);
        return ticketService.updateTicket(user, ticketRef, request);
    }

    @PutMapping("/{ticketRef}/status")
    public TicketResponse updateStatus(
            @PathVariable String ticketRef,
            @Valid @RequestBody TicketStatusUpdateRequest request,
            Authentication authentication) {
        UserEntity user = currentUserService.requireCurrentUserWithCompletedOnboarding(authentication);
        return ticketService.updateStatus(user, ticketRef, request);
    }

    @PutMapping("/{ticketRef}/assign")
    public TicketResponse assignTicket(
            @PathVariable String ticketRef,
            @Valid @RequestBody AssignTicketRequest request,
            Authentication authentication) {
        UserEntity user = currentUserService.requireCurrentUserWithCompletedOnboarding(authentication);
        return ticketService.assignTicket(user, ticketRef, request.assignedTo());
    }

    @GetMapping("/{ticketRef}/comments")
    public List<TicketCommentResponse> listComments(@PathVariable String ticketRef, Authentication authentication) {
        UserEntity user = currentUserService.requireCurrentUserWithCompletedOnboarding(authentication);
        return ticketService.listComments(user, ticketRef);
    }

    @PostMapping("/{ticketRef}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public TicketCommentResponse addComment(
            @PathVariable String ticketRef,
            @Valid @RequestBody AddCommentRequest request,
            Authentication authentication) {
        UserEntity user = currentUserService.requireCurrentUserWithCompletedOnboarding(authentication);
        return ticketService.addComment(user, ticketRef, request);
    }

    @GetMapping("/{ticketRef}/attachments")
    public List<TicketAttachmentResponse> listAttachments(@PathVariable String ticketRef, Authentication authentication) {
        UserEntity user = currentUserService.requireCurrentUserWithCompletedOnboarding(authentication);
        return ticketService.listAttachments(user, ticketRef);
    }

    @PostMapping(value = "/{ticketRef}/attachments", consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public TicketAttachmentResponse addAttachment(
            @PathVariable String ticketRef,
            @Valid @RequestBody AddTicketAttachmentRequest request,
            Authentication authentication) {
        UserEntity user = currentUserService.requireCurrentUserWithCompletedOnboarding(authentication);
        return ticketService.addAttachment(user, ticketRef, request);
    }

    @PostMapping(value = "/{ticketRef}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public TicketAttachmentResponse uploadAttachment(
            @PathVariable String ticketRef,
            @RequestPart("file") MultipartFile file,
            Authentication authentication) {
        UserEntity user = currentUserService.requireCurrentUserWithCompletedOnboarding(authentication);
        return ticketService.uploadAttachment(user, ticketRef, file);
    }

    @DeleteMapping("/{ticketRef}/attachments/{attachmentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAttachment(
            @PathVariable String ticketRef,
            @PathVariable UUID attachmentId,
            Authentication authentication) {
        UserEntity user = currentUserService.requireCurrentUserWithCompletedOnboarding(authentication);
        ticketService.deleteAttachment(user, ticketRef, attachmentId);
    }

    @GetMapping("/{ticketRef}/history")
    public List<TicketStatusHistoryResponse> getStatusHistory(
            @PathVariable String ticketRef,
            Authentication authentication) {
        UserEntity user = currentUserService.requireCurrentUserWithCompletedOnboarding(authentication);
        return ticketService.getStatusHistory(user, ticketRef);
    }
}
