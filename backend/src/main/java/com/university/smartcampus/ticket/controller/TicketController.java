package com.university.smartcampus.ticket.controller;

import java.util.List;
import java.util.UUID;
import java.time.Instant;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.hateoas.CollectionModel;
import org.springframework.hateoas.EntityModel;
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
import com.university.smartcampus.ticket.assembler.TicketModelAssembler;
import com.university.smartcampus.ticket.dto.TicketDtos.AddCommentRequest;
import com.university.smartcampus.ticket.dto.TicketDtos.AddTicketAttachmentRequest;
import com.university.smartcampus.ticket.dto.TicketDtos.AssignTicketRequest;
import com.university.smartcampus.ticket.dto.TicketDtos.CreateTicketRequest;
import com.university.smartcampus.ticket.dto.TicketDtos.TicketAnalyticsBucket;
import com.university.smartcampus.ticket.dto.TicketDtos.TicketAnalyticsResponse;
import com.university.smartcampus.ticket.dto.TicketDtos.TicketAttachmentResponse;
import com.university.smartcampus.ticket.dto.TicketDtos.TicketCommentResponse;
import com.university.smartcampus.ticket.dto.TicketDtos.TicketResponse;
import com.university.smartcampus.ticket.dto.TicketDtos.TicketStatusHistoryResponse;
import com.university.smartcampus.ticket.dto.TicketDtos.TicketStatusUpdateRequest;
import com.university.smartcampus.ticket.dto.TicketDtos.TicketSummaryResponse;
import com.university.smartcampus.ticket.dto.TicketDtos.UpdateCommentRequest;
import com.university.smartcampus.ticket.dto.TicketDtos.UpdateTicketRequest;
import com.university.smartcampus.ticket.service.TicketAnalyticsService;
import com.university.smartcampus.ticket.service.TicketService;
import com.university.smartcampus.user.entity.UserEntity;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/tickets")
public class TicketController {

    private final CurrentUserService currentUserService;
    private final TicketService ticketService;
    private final TicketAnalyticsService ticketAnalyticsService;
    private final TicketModelAssembler ticketModelAssembler;

    public TicketController(
            CurrentUserService currentUserService,
            TicketService ticketService,
            TicketAnalyticsService ticketAnalyticsService,
            TicketModelAssembler ticketModelAssembler) {
        this.currentUserService = currentUserService;
        this.ticketService = ticketService;
        this.ticketAnalyticsService = ticketAnalyticsService;
        this.ticketModelAssembler = ticketModelAssembler;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public EntityModel<TicketResponse> createTicket(
            @Valid @RequestBody CreateTicketRequest request,
            Authentication authentication) {
        UserEntity user = currentUserService.requireCurrentUserWithCompletedOnboarding(authentication);
        return ticketModelAssembler.toTicketModel(user, ticketService.createTicket(user, request));
    }

    @GetMapping
    public CollectionModel<EntityModel<TicketSummaryResponse>> listTickets(
            @RequestParam(required = false) TicketStatus status,
            @RequestParam(required = false) TicketCategory category,
            @RequestParam(required = false) TicketPriority priority,
            Authentication authentication) {
        UserEntity user = currentUserService.requireCurrentUserWithCompletedOnboarding(authentication);
        List<TicketSummaryResponse> tickets = ticketService.listTickets(user, status, category, priority);
        return ticketModelAssembler.toTicketSummaryCollection(user, tickets, status, category, priority);
    }

    @GetMapping("/analytics")
    public TicketAnalyticsResponse getAnalytics(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(required = false) TicketAnalyticsBucket bucket,
            @RequestParam(required = false) UUID assigneeId,
            @RequestParam(required = false) Boolean unassignedOnly,
            @RequestParam(required = false) TicketCategory category,
            @RequestParam(required = false) TicketPriority priority,
            Authentication authentication) {
        UserEntity user = currentUserService.requireCurrentUserWithCompletedOnboarding(authentication);
        return ticketAnalyticsService.getAnalytics(user, from, to, bucket, assigneeId, unassignedOnly, category, priority);
    }

    @GetMapping("/{ticketRef}")
    public EntityModel<TicketResponse> getTicket(@PathVariable String ticketRef, Authentication authentication) {
        UserEntity user = currentUserService.requireCurrentUserWithCompletedOnboarding(authentication);
        return ticketModelAssembler.toTicketModel(user, ticketService.getTicket(user, ticketRef));
    }

    @DeleteMapping("/{ticketRef}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTicket(@PathVariable String ticketRef, Authentication authentication) {
        UserEntity user = currentUserService.requireCurrentUserWithCompletedOnboarding(authentication);
        ticketService.deleteTicket(user, ticketRef);
    }

    @PatchMapping("/{ticketRef}")
    public EntityModel<TicketResponse> updateTicket(
            @PathVariable String ticketRef,
            @Valid @RequestBody UpdateTicketRequest request,
            Authentication authentication) {
        UserEntity user = currentUserService.requireCurrentUserWithCompletedOnboarding(authentication);
        return ticketModelAssembler.toTicketModel(user, ticketService.updateTicket(user, ticketRef, request));
    }

    @PutMapping("/{ticketRef}/status")
    public EntityModel<TicketResponse> updateStatus(
            @PathVariable String ticketRef,
            @Valid @RequestBody TicketStatusUpdateRequest request,
            Authentication authentication) {
        UserEntity user = currentUserService.requireCurrentUserWithCompletedOnboarding(authentication);
        return ticketModelAssembler.toTicketModel(user, ticketService.updateStatus(user, ticketRef, request));
    }

    @PutMapping("/{ticketRef}/assign")
    public EntityModel<TicketResponse> assignTicket(
            @PathVariable String ticketRef,
            @Valid @RequestBody AssignTicketRequest request,
            Authentication authentication) {
        UserEntity user = currentUserService.requireCurrentUserWithCompletedOnboarding(authentication);
        return ticketModelAssembler.toTicketModel(user, ticketService.assignTicket(user, ticketRef, request.assignedTo()));
    }

    @GetMapping("/{ticketRef}/comments")
    public CollectionModel<EntityModel<TicketCommentResponse>> listComments(
            @PathVariable String ticketRef,
            Authentication authentication) {
        UserEntity user = currentUserService.requireCurrentUserWithCompletedOnboarding(authentication);
        TicketResponse ticket = ticketService.getTicket(user, ticketRef);
        List<TicketCommentResponse> comments = ticketService.listComments(user, ticketRef);
        return ticketModelAssembler.toCommentCollection(user, ticket, comments);
    }

    @GetMapping("/{ticketRef}/comments/{commentId}")
    public EntityModel<TicketCommentResponse> getComment(
            @PathVariable String ticketRef,
            @PathVariable UUID commentId,
            Authentication authentication) {
        UserEntity user = currentUserService.requireCurrentUserWithCompletedOnboarding(authentication);
        TicketResponse ticket = ticketService.getTicket(user, ticketRef);
        TicketCommentResponse comment = ticketService.getComment(user, ticketRef, commentId);
        List<TicketCommentResponse> comments = ticketService.listComments(user, ticketRef);
        UUID latestCommentId = comments.isEmpty() ? null : comments.get(comments.size() - 1).id();
        return ticketModelAssembler.toCommentModel(user, ticket, comment, latestCommentId);
    }

    @PostMapping("/{ticketRef}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public EntityModel<TicketCommentResponse> addComment(
            @PathVariable String ticketRef,
            @Valid @RequestBody AddCommentRequest request,
            Authentication authentication) {
        UserEntity user = currentUserService.requireCurrentUserWithCompletedOnboarding(authentication);
        TicketCommentResponse comment = ticketService.addComment(user, ticketRef, request);
        TicketResponse ticket = ticketService.getTicket(user, ticketRef);
        return ticketModelAssembler.toCommentModel(user, ticket, comment, comment.id());
    }

    @PatchMapping("/{ticketRef}/comments/{commentId}")
    public EntityModel<TicketCommentResponse> updateComment(
            @PathVariable String ticketRef,
            @PathVariable UUID commentId,
            @Valid @RequestBody UpdateCommentRequest request,
            Authentication authentication) {
        UserEntity user = currentUserService.requireCurrentUserWithCompletedOnboarding(authentication);
        TicketCommentResponse comment = ticketService.updateComment(user, ticketRef, commentId, request);
        TicketResponse ticket = ticketService.getTicket(user, ticketRef);
        return ticketModelAssembler.toCommentModel(user, ticket, comment, comment.id());
    }

    @DeleteMapping("/{ticketRef}/comments/{commentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteComment(
            @PathVariable String ticketRef,
            @PathVariable UUID commentId,
            Authentication authentication) {
        UserEntity user = currentUserService.requireCurrentUserWithCompletedOnboarding(authentication);
        ticketService.deleteComment(user, ticketRef, commentId);
    }

    @GetMapping("/{ticketRef}/attachments")
    public CollectionModel<EntityModel<TicketAttachmentResponse>> listAttachments(
            @PathVariable String ticketRef,
            Authentication authentication) {
        UserEntity user = currentUserService.requireCurrentUserWithCompletedOnboarding(authentication);
        TicketResponse ticket = ticketService.getTicket(user, ticketRef);
        return ticketModelAssembler.toAttachmentCollection(user, ticket, ticketService.listAttachments(user, ticketRef));
    }

    @GetMapping("/{ticketRef}/attachments/{attachmentId}")
    public EntityModel<TicketAttachmentResponse> getAttachment(
            @PathVariable String ticketRef,
            @PathVariable UUID attachmentId,
            Authentication authentication) {
        UserEntity user = currentUserService.requireCurrentUserWithCompletedOnboarding(authentication);
        TicketResponse ticket = ticketService.getTicket(user, ticketRef);
        TicketAttachmentResponse attachment = ticketService.getAttachment(user, ticketRef, attachmentId);
        return ticketModelAssembler.toAttachmentModel(user, ticket, attachment);
    }

    @PostMapping(value = "/{ticketRef}/attachments", consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public EntityModel<TicketAttachmentResponse> addAttachment(
            @PathVariable String ticketRef,
            @Valid @RequestBody AddTicketAttachmentRequest request,
            Authentication authentication) {
        UserEntity user = currentUserService.requireCurrentUserWithCompletedOnboarding(authentication);
        TicketAttachmentResponse attachment = ticketService.addAttachment(user, ticketRef, request);
        TicketResponse ticket = ticketService.getTicket(user, ticketRef);
        return ticketModelAssembler.toAttachmentModel(user, ticket, attachment);
    }

    @PostMapping(value = "/{ticketRef}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public EntityModel<TicketAttachmentResponse> uploadAttachment(
            @PathVariable String ticketRef,
            @RequestPart("file") MultipartFile file,
            Authentication authentication) {
        UserEntity user = currentUserService.requireCurrentUserWithCompletedOnboarding(authentication);
        TicketAttachmentResponse attachment = ticketService.uploadAttachment(user, ticketRef, file);
        TicketResponse ticket = ticketService.getTicket(user, ticketRef);
        return ticketModelAssembler.toAttachmentModel(user, ticket, attachment);
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
    public CollectionModel<EntityModel<TicketStatusHistoryResponse>> getStatusHistory(
            @PathVariable String ticketRef,
            Authentication authentication) {
        UserEntity user = currentUserService.requireCurrentUserWithCompletedOnboarding(authentication);
        TicketResponse ticket = ticketService.getTicket(user, ticketRef);
        return ticketModelAssembler.toStatusHistoryCollection(ticket, ticketService.getStatusHistory(user, ticketRef));
    }

    @GetMapping("/{ticketRef}/history/{historyId}")
    public EntityModel<TicketStatusHistoryResponse> getStatusHistoryEntry(
            @PathVariable String ticketRef,
            @PathVariable UUID historyId,
            Authentication authentication) {
        UserEntity user = currentUserService.requireCurrentUserWithCompletedOnboarding(authentication);
        TicketResponse ticket = ticketService.getTicket(user, ticketRef);
        TicketStatusHistoryResponse history = ticketService.getStatusHistoryEntry(user, ticketRef, historyId);
        return ticketModelAssembler.toStatusHistoryModel(ticket, history);
    }
}
