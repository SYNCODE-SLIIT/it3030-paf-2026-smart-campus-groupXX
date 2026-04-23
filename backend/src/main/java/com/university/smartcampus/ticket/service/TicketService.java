package com.university.smartcampus.ticket.service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import com.university.smartcampus.common.enums.AppEnums.AccountStatus;
import com.university.smartcampus.common.enums.AppEnums.ManagerRole;
import com.university.smartcampus.common.enums.AppEnums.TicketCategory;
import com.university.smartcampus.common.enums.AppEnums.TicketPriority;
import com.university.smartcampus.common.enums.AppEnums.TicketStatus;
import com.university.smartcampus.AppEnums.ResourceStatus;
import com.university.smartcampus.common.enums.AppEnums.UserType;
import com.university.smartcampus.common.exception.BadRequestException;
import com.university.smartcampus.common.exception.ForbiddenException;
import com.university.smartcampus.common.exception.NotFoundException;
import com.university.smartcampus.notification.NotificationService;
import com.university.smartcampus.resource.ResourceEntity;
import com.university.smartcampus.resource.ResourceRepository;
import com.university.smartcampus.ticket.dto.TicketDtos.AddCommentRequest;
import com.university.smartcampus.ticket.dto.TicketDtos.AddTicketAttachmentRequest;
import com.university.smartcampus.ticket.dto.TicketDtos.CreateTicketRequest;
import com.university.smartcampus.ticket.dto.TicketDtos.TicketAttachmentResponse;
import com.university.smartcampus.ticket.dto.TicketDtos.TicketCommentResponse;
import com.university.smartcampus.ticket.dto.TicketDtos.TicketListScope;
import com.university.smartcampus.ticket.dto.TicketDtos.TicketResponse;
import com.university.smartcampus.ticket.dto.TicketDtos.TicketStatusHistoryResponse;
import com.university.smartcampus.ticket.dto.TicketDtos.TicketStatusUpdateRequest;
import com.university.smartcampus.ticket.dto.TicketDtos.TicketSummaryResponse;
import com.university.smartcampus.ticket.dto.TicketDtos.UpdateCommentRequest;
import com.university.smartcampus.ticket.dto.TicketDtos.UpdateTicketRequest;
import com.university.smartcampus.ticket.entity.TicketAttachmentEntity;
import com.university.smartcampus.ticket.entity.TicketAssignmentHistoryEntity;
import com.university.smartcampus.ticket.entity.TicketCommentEntity;
import com.university.smartcampus.ticket.entity.TicketEntity;
import com.university.smartcampus.ticket.entity.TicketStatusHistoryEntity;
import com.university.smartcampus.ticket.repository.TicketAttachmentRepository;
import com.university.smartcampus.ticket.repository.TicketAssignmentHistoryRepository;
import com.university.smartcampus.ticket.repository.TicketCommentRepository;
import com.university.smartcampus.ticket.repository.TicketRepository;
import com.university.smartcampus.ticket.repository.TicketStatusHistoryRepository;
import com.university.smartcampus.ticket.storage.TicketAttachmentStorageClient;
import com.university.smartcampus.ticket.storage.TicketAttachmentStorageClient.StoredAttachment;
import com.university.smartcampus.user.entity.UserEntity;
import com.university.smartcampus.user.repository.UserRepository;

@Service
public class TicketService {

    private final TicketRepository ticketRepository;
    private final TicketAttachmentRepository ticketAttachmentRepository;
    private final TicketAssignmentHistoryRepository ticketAssignmentHistoryRepository;
    private final TicketCommentRepository ticketCommentRepository;
    private final TicketStatusHistoryRepository ticketStatusHistoryRepository;
    private final TicketAttachmentStorageClient ticketAttachmentStorageClient;
    private final UserRepository userRepository;
    private final ResourceRepository resourceRepository;
    private final NotificationService notificationService;

    public TicketService(
            TicketRepository ticketRepository,
            TicketAttachmentRepository ticketAttachmentRepository,
            TicketAssignmentHistoryRepository ticketAssignmentHistoryRepository,
            TicketCommentRepository ticketCommentRepository,
            TicketStatusHistoryRepository ticketStatusHistoryRepository,
            TicketAttachmentStorageClient ticketAttachmentStorageClient,
            UserRepository userRepository,
            ResourceRepository resourceRepository,
            NotificationService notificationService) {
        this.ticketRepository = ticketRepository;
        this.ticketAttachmentRepository = ticketAttachmentRepository;
        this.ticketAssignmentHistoryRepository = ticketAssignmentHistoryRepository;
        this.ticketCommentRepository = ticketCommentRepository;
        this.ticketStatusHistoryRepository = ticketStatusHistoryRepository;
        this.ticketAttachmentStorageClient = ticketAttachmentStorageClient;
        this.userRepository = userRepository;
        this.resourceRepository = resourceRepository;
        this.notificationService = notificationService;
    }

    @Transactional
    public TicketResponse createTicket(UserEntity reporter, CreateTicketRequest request) {
        long seq = ticketRepository.nextTicketCodeSequence();
        String ticketCode = String.format("TCK-%04d", seq);

        TicketEntity ticket = new TicketEntity();
        ticket.setId(UUID.randomUUID());
        ticket.setTicketCode(ticketCode);
        ticket.setTitle(request.title());
        ticket.setDescription(request.description());
        ticket.setCategory(request.category());
        ticket.setPriority(request.priority());
        ticket.setStatus(TicketStatus.OPEN);
        ticket.setReportedBy(reporter);
        ticket.setContactNote(request.contactNote());

        ResourceStatus oldResourceStatus = null;
        ResourceStatus newResourceStatus = null;
        if (request.resourceId() != null) {
            ResourceEntity resource = resolveResource(request.resourceId());
            ticket.setResource(resource);
            ticket.setLocation(resource.getLocationEntity());

            oldResourceStatus = resource.getStatus();
            if (request.priority() == TicketPriority.URGENT && resource.getStatus() == ResourceStatus.ACTIVE) {
                resource.setStatus(ResourceStatus.INACTIVE);
                newResourceStatus = resource.getStatus();
                resourceRepository.save(resource);
            }
        }

        ticketRepository.save(ticket);

        recordHistory(ticket, null, TicketStatus.OPEN, reporter, null);
        notificationService.notifyTicketCreated(ticket);
        if (oldResourceStatus != null && newResourceStatus != null) {
            notificationService.notifyTicketResourceImpacted(ticket, oldResourceStatus, newResourceStatus);
        }

        return toTicketResponse(ticket);
    }

    @Transactional(readOnly = true)
    public List<TicketSummaryResponse> listTickets(
            UserEntity user,
            TicketStatus status,
            TicketCategory category,
            TicketPriority priority,
            TicketListScope scope) {
        Specification<TicketEntity> spec = (root, query, cb) -> cb.conjunction();

        if (isAdmin(user)) {
            // admin sees all tickets
        } else if (isTicketManager(user)) {
            UUID userId = user.getId();
            if (scope == TicketListScope.REPORTED) {
                spec = spec.and((root, query, cb) -> cb.equal(root.get("reportedBy").get("id"), userId));
            } else {
                spec = spec.and((root, query, cb) -> cb.equal(root.get("assignedTo").get("id"), userId));
            }
        } else {
            UUID userId = user.getId();
            spec = spec.and((root, query, cb) -> cb.equal(root.get("reportedBy").get("id"), userId));
        }

        if (status != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status));
        }
        if (category != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("category"), category));
        }
        if (priority != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("priority"), priority));
        }

        return ticketRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "createdAt"))
                .stream()
                .map(this::toTicketSummaryResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public TicketResponse getTicket(UserEntity user, String ticketRef) {
        TicketEntity ticket = requireAccessibleTicket(user, ticketRef);
        return toTicketResponse(ticket);
    }

    @Transactional
    public TicketResponse updateTicket(UserEntity user, String ticketRef, UpdateTicketRequest request) {
        TicketEntity ticket = getTicketEntity(ticketRef);

        if (!ticket.getReportedBy().getId().equals(user.getId())) {
            throw new ForbiddenException("You can only update your own tickets.");
        }
        if (ticket.getStatus() != TicketStatus.OPEN) {
            throw new BadRequestException("Ticket details can only be updated while the ticket is open.");
        }

        if (request.priority() != null) {
            ticket.setPriority(request.priority());
        }
        if (request.contactNote() != null) {
            ticket.setContactNote(request.contactNote());
        }

        return toTicketResponse(ticket);
    }

    @Transactional
    public void deleteTicket(UserEntity user, String ticketRef) {
        TicketEntity ticket = getTicketEntity(ticketRef);

        if (isAdmin(user)) {
            if (ticket.getStatus() != TicketStatus.CLOSED) {
                throw new BadRequestException("Admins can only delete closed tickets.");
            }
        } else {
            if (!ticket.getReportedBy().getId().equals(user.getId())) {
                throw new ForbiddenException("Only the ticket reporter or admin can delete tickets.");
            }
            if (ticket.getAssignedTo() != null) {
                throw new BadRequestException("Tickets can only be deleted by the reporter before assignment.");
            }
        }

        for (String fileUrl : ticketAttachmentRepository.findFileUrlsByTicketId(ticket.getId())) {
            ticketAttachmentStorageClient.deleteByPublicUrl(fileUrl);
        }
        ticketRepository.delete(ticket);
    }

    @Transactional
    public TicketResponse updateStatus(UserEntity manager, String ticketRef, TicketStatusUpdateRequest request) {
        if (request.assignedTo() != null) {
            throw new BadRequestException("Ticket assignment must use the assignment endpoint.");
        }
        if (!isTicketManagerOrAdmin(manager)) {
            throw new ForbiddenException("Ticket manager or admin access is required.");
        }

        TicketEntity ticket = getTicketEntity(ticketRef);
        requireTicketStatusManagementAccess(manager, ticket);

        TicketStatus oldStatus = ticket.getStatus();
        if (oldStatus == TicketStatus.CLOSED) {
            throw new BadRequestException("Closed tickets cannot be updated.");
        }
        validateStatusTransition(oldStatus, request.newStatus());
        if (request.newStatus() == TicketStatus.REJECTED && !StringUtils.hasText(request.rejectionReason())) {
            throw new BadRequestException("Rejection reason is required when rejecting a ticket.");
        }
        if (request.newStatus() == TicketStatus.RESOLVED && !StringUtils.hasText(request.resolutionNotes())) {
            throw new BadRequestException("Resolution notes are required when resolving a ticket.");
        }

        ticket.setStatus(request.newStatus());

        if (StringUtils.hasText(request.resolutionNotes())) {
            ticket.setResolutionNotes(request.resolutionNotes());
        }
        if (StringUtils.hasText(request.rejectionReason())) {
            ticket.setRejectionReason(request.rejectionReason());
        }

        Instant now = Instant.now();
        if (request.newStatus() == TicketStatus.RESOLVED && ticket.getResolvedAt() == null) {
            ticket.setResolvedAt(now);
        }
        if (request.newStatus() == TicketStatus.CLOSED && ticket.getClosedAt() == null) {
            ticket.setClosedAt(now);
        }

        recordHistory(ticket, oldStatus, request.newStatus(), manager, request.note());
        notificationService.notifyTicketStatusChanged(ticket, oldStatus, request.newStatus(), manager);

        return toTicketResponse(ticket);
    }

    @Transactional
    public TicketResponse assignTicket(UserEntity actor, String ticketRef, UUID assignedToUserId) {
        if (!isAdmin(actor)) {
            throw new ForbiddenException("Admin access is required to assign tickets.");
        }
        TicketEntity ticket = getTicketEntity(ticketRef);
        if (ticket.getStatus() != TicketStatus.OPEN) {
            throw new BadRequestException("Tickets cannot be reassigned after they are accepted.");
        }
        UserEntity oldAssignee = ticket.getAssignedTo();
        UserEntity newAssignee = resolveAssignableAssignee(assignedToUserId);
        ticket.setAssignedTo(newAssignee);
        recordAssignmentHistory(ticket, oldAssignee, newAssignee, actor, null);
        notificationService.notifyTicketAssigned(ticket, oldAssignee, newAssignee, actor);
        return toTicketResponse(ticket);
    }

    @Transactional
    public TicketCommentResponse addComment(UserEntity user, String ticketRef, AddCommentRequest request) {
        TicketEntity ticket = requireAccessibleTicket(user, ticketRef);

        if (ticket.getStatus() == TicketStatus.CLOSED || ticket.getStatus() == TicketStatus.REJECTED) {
            throw new BadRequestException("Cannot add comments to a closed or rejected ticket.");
        }
        if (isAdmin(user) && ticket.getStatus() != TicketStatus.IN_PROGRESS) {
            throw new BadRequestException("Admins can only comment on in-progress tickets.");
        }
        if (isTicketManager(user) && !isReporter(ticket, user) && ticket.getStatus() == TicketStatus.OPEN) {
            throw new BadRequestException("Cannot comment on an open ticket before accepting it.");
        }

        TicketCommentEntity comment = new TicketCommentEntity();
        comment.setId(UUID.randomUUID());
        comment.setTicket(ticket);
        comment.setUser(user);
        comment.setCommentText(request.commentText());
        comment.setEdited(false);
        ticketCommentRepository.save(comment);
        notificationService.notifyTicketCommentAdded(ticket, comment);

        return toCommentResponse(comment);
    }

    @Transactional(readOnly = true)
    public List<TicketCommentResponse> listComments(UserEntity user, String ticketRef) {
        TicketEntity ticket = requireAccessibleTicket(user, ticketRef);
        return ticketCommentRepository.findByTicketIdOrderByCreatedAtAscIdAsc(ticket.getId())
                .stream()
                .map(this::toCommentResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public TicketCommentResponse getComment(UserEntity user, String ticketRef, UUID commentId) {
        TicketEntity ticket = requireAccessibleTicket(user, ticketRef);
        TicketCommentEntity comment = ticketCommentRepository.findByIdAndTicketId(commentId, ticket.getId())
                .orElseThrow(() -> new NotFoundException("Ticket comment not found."));
        return toCommentResponse(comment);
    }

    @Transactional
    public TicketCommentResponse updateComment(UserEntity user, String ticketRef, UUID commentId,
            UpdateCommentRequest request) {
        TicketEntity ticket = requireAccessibleTicket(user, ticketRef);
        TicketCommentEntity comment = ticketCommentRepository.findByIdAndTicketId(commentId, ticket.getId())
                .orElseThrow(() -> new NotFoundException("Ticket comment not found."));

        if (!comment.getUser().getId().equals(user.getId())) {
            throw new ForbiddenException("You can only edit your own comments.");
        }

        TicketCommentEntity latestComment = ticketCommentRepository
                .findFirstByTicketIdOrderByCreatedAtDescIdDesc(ticket.getId())
                .orElseThrow(() -> new NotFoundException("Ticket comment not found."));
        if (!latestComment.getId().equals(comment.getId())) {
            throw new BadRequestException("Only the latest ticket comment can be edited.");
        }

        comment.setCommentText(request.commentText());
        comment.setEdited(true);
        ticketCommentRepository.saveAndFlush(comment);

        return toCommentResponse(comment);
    }

    @Transactional
    public void deleteComment(UserEntity user, String ticketRef, UUID commentId) {
        TicketEntity ticket = requireAccessibleTicket(user, ticketRef);
        TicketCommentEntity comment = ticketCommentRepository.findByIdAndTicketId(commentId, ticket.getId())
                .orElseThrow(() -> new NotFoundException("Ticket comment not found."));

        if (!isAdmin(user) && !comment.getUser().getId().equals(user.getId())) {
            throw new ForbiddenException("You can only delete your own comments.");
        }

        TicketCommentEntity latestComment = ticketCommentRepository
                .findFirstByTicketIdOrderByCreatedAtDescIdDesc(ticket.getId())
                .orElseThrow(() -> new NotFoundException("Ticket comment not found."));
        if (!latestComment.getId().equals(comment.getId())) {
            throw new BadRequestException("Only the latest ticket comment can be deleted.");
        }

        ticketCommentRepository.delete(comment);
    }

    @Transactional(readOnly = true)
    public List<TicketStatusHistoryResponse> getStatusHistory(UserEntity user, String ticketRef) {
        TicketEntity ticket = requireAccessibleTicket(user, ticketRef);
        return ticketStatusHistoryRepository.findByTicketIdOrderByChangedAtAsc(ticket.getId())
                .stream()
                .map(this::toHistoryResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public TicketStatusHistoryResponse getStatusHistoryEntry(UserEntity user, String ticketRef, UUID historyId) {
        TicketEntity ticket = requireAccessibleTicket(user, ticketRef);
        TicketStatusHistoryEntity history = ticketStatusHistoryRepository.findByIdAndTicketId(historyId, ticket.getId())
                .orElseThrow(() -> new NotFoundException("Ticket status history entry not found."));
        return toHistoryResponse(history);
    }

    @Transactional(readOnly = true)
    public List<TicketAttachmentResponse> listAttachments(UserEntity user, String ticketRef) {
        TicketEntity ticket = requireAccessibleTicket(user, ticketRef);
        return ticketAttachmentRepository.findByTicketIdOrderByUploadedAtAsc(ticket.getId())
                .stream()
                .map(this::toAttachmentResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public TicketAttachmentResponse getAttachment(UserEntity user, String ticketRef, UUID attachmentId) {
        TicketEntity ticket = requireAccessibleTicket(user, ticketRef);
        TicketAttachmentEntity attachment = ticketAttachmentRepository.findByIdAndTicketId(attachmentId, ticket.getId())
                .orElseThrow(() -> new NotFoundException("Ticket attachment not found."));
        return toAttachmentResponse(attachment);
    }

    @Transactional
    public TicketAttachmentResponse addAttachment(UserEntity user, String ticketRef, AddTicketAttachmentRequest request) {
        TicketEntity ticket = getTicketEntity(ticketRef);
        requireAttachmentManagementAccess(user, ticket);
        if (ticketAttachmentRepository.countByTicketId(ticket.getId()) >= 3) {
            throw new BadRequestException("A ticket may have at most 3 attachments.");
        }

        TicketAttachmentEntity attachment = new TicketAttachmentEntity();
        attachment.setId(UUID.randomUUID());
        attachment.setTicket(ticket);
        attachment.setFileName(request.fileName());
        attachment.setFileUrl(request.fileUrl());
        attachment.setFileType(request.fileType());
        attachment.setUploadedAt(Instant.now());
        ticketAttachmentRepository.save(attachment);

        return toAttachmentResponse(attachment);
    }

    @Transactional
    public TicketAttachmentResponse uploadAttachment(UserEntity user, String ticketRef, MultipartFile file) {
        TicketEntity ticket = getTicketEntity(ticketRef);
        requireAttachmentManagementAccess(user, ticket);
        if (ticketAttachmentRepository.countByTicketId(ticket.getId()) >= 3) {
            throw new BadRequestException("A ticket may have at most 3 attachments.");
        }
        StoredAttachment storedAttachment = ticketAttachmentStorageClient.upload(ticket.getId(), file);

        TicketAttachmentEntity attachment = new TicketAttachmentEntity();
        attachment.setId(UUID.randomUUID());
        attachment.setTicket(ticket);
        attachment.setFileName(storedAttachment.fileName());
        attachment.setFileUrl(storedAttachment.fileUrl());
        attachment.setFileType(storedAttachment.fileType());
        attachment.setUploadedAt(Instant.now());
        ticketAttachmentRepository.saveAndFlush(attachment);

        return toAttachmentResponse(attachment);
    }

    @Transactional
    public void deleteAttachment(UserEntity user, String ticketRef, UUID attachmentId) {
        TicketEntity ticket = getTicketEntity(ticketRef);
        requireAttachmentManagementAccess(user, ticket);
        TicketAttachmentEntity attachment = ticketAttachmentRepository.findByIdAndTicketId(attachmentId, ticket.getId())
                .orElseThrow(() -> new NotFoundException("Ticket attachment not found."));
        ticketAttachmentStorageClient.deleteByPublicUrl(attachment.getFileUrl());
        ticketAttachmentRepository.delete(attachment);
    }

    private void recordHistory(TicketEntity ticket, TicketStatus oldStatus, TicketStatus newStatus,
            UserEntity changedBy, String note) {
        TicketStatusHistoryEntity history = new TicketStatusHistoryEntity();
        history.setId(UUID.randomUUID());
        history.setTicket(ticket);
        history.setOldStatus(oldStatus);
        history.setNewStatus(newStatus);
        history.setChangedBy(changedBy);
        history.setNote(note);
        history.setChangedAt(Instant.now());
        ticketStatusHistoryRepository.save(history);
    }

    private void recordAssignmentHistory(TicketEntity ticket, UserEntity oldAssignee, UserEntity newAssignee,
            UserEntity changedBy, String note) {
        TicketAssignmentHistoryEntity history = new TicketAssignmentHistoryEntity();
        history.setId(UUID.randomUUID());
        history.setTicket(ticket);
        history.setOldAssignee(oldAssignee);
        history.setNewAssignee(newAssignee);
        history.setChangedBy(changedBy);
        history.setNote(note);
        history.setChangedAt(Instant.now());
        ticketAssignmentHistoryRepository.save(history);
    }

    private void requireAttachmentManagementAccess(UserEntity user, TicketEntity ticket) {
        if (!ticket.getReportedBy().getId().equals(user.getId())
                && !(isTicketManager(user) && isAssignedTo(ticket, user))) {
            throw new ForbiddenException("Only the ticket creator or assigned ticket manager can modify attachments.");
        }
        if (ticket.getStatus() != TicketStatus.OPEN) {
            throw new BadRequestException("Attachments cannot be modified once a ticket is no longer open.");
        }
    }

    private TicketEntity requireAccessibleTicket(UserEntity user, String ticketRef) {
        TicketEntity ticket = getTicketEntity(ticketRef);
        if (isAdmin(user)) {
            return ticket;
        }
        if (isTicketManager(user)) {
            if (isAssignedTo(ticket, user) || isReporter(ticket, user)) {
                return ticket;
            }
            throw new ForbiddenException("You do not have access to this ticket.");
        }
        if (isReporter(ticket, user)) {
            return ticket;
        }
        throw new ForbiddenException("You do not have access to this ticket.");
    }

    private void requireTicketStatusManagementAccess(UserEntity user, TicketEntity ticket) {
        if (isAdmin(user)) {
            if (isAssignedTo(ticket, user)) {
                return;
            }
            throw new ForbiddenException("Admins can only update tickets assigned to themselves.");
        }
        if (isTicketManager(user) && isAssignedTo(ticket, user)) {
            return;
        }
        throw new ForbiddenException("You do not have access to this ticket.");
    }

    private TicketEntity getTicketEntity(UUID id) {
        return ticketRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Ticket not found."));
    }

    private TicketEntity getTicketEntity(String ticketRef) {
        if (!StringUtils.hasText(ticketRef)) {
            throw new NotFoundException("Ticket not found.");
        }

        String normalizedTicketRef = ticketRef.trim();
        try {
            return getTicketEntity(UUID.fromString(normalizedTicketRef));
        } catch (IllegalArgumentException ignored) {
            return ticketRepository.findByTicketCodeIgnoreCase(normalizedTicketRef)
                    .orElseThrow(() -> new NotFoundException("Ticket not found."));
        }
    }

    private UserEntity resolveAssignableAssignee(UUID assignedToUserId) {
        UserEntity assignee = userRepository.findById(assignedToUserId)
                .orElseThrow(() -> new NotFoundException("Assigned user not found."));
        if (!isAssignableAssignee(assignee)) {
            throw new BadRequestException("Tickets can only be assigned to active admins or ticket managers.");
        }
        return assignee;
    }

    private ResourceEntity resolveResource(UUID resourceId) {
        return resourceRepository.findById(resourceId)
                .orElseThrow(() -> new NotFoundException("Resource not found."));
    }

    private boolean isAssignableAssignee(UserEntity user) {
        return user.getAccountStatus() == AccountStatus.ACTIVE
                && (isAdmin(user) || isTicketManager(user));
    }

    private boolean isAssignedTo(TicketEntity ticket, UserEntity user) {
        return ticket.getAssignedTo() != null
                && ticket.getAssignedTo().getId().equals(user.getId());
    }

    private boolean isReporter(TicketEntity ticket, UserEntity user) {
        return ticket.getReportedBy() != null
                && ticket.getReportedBy().getId().equals(user.getId());
    }

    private void validateStatusTransition(TicketStatus currentStatus, TicketStatus nextStatus) {
        if (nextStatus == TicketStatus.OPEN) {
            throw new BadRequestException("Cannot transition a ticket back to OPEN.");
        }
        if (currentStatus == nextStatus) {
            throw new BadRequestException("No status transition requested.");
        }

        boolean allowed = switch (currentStatus) {
            case OPEN -> nextStatus == TicketStatus.IN_PROGRESS;
            case IN_PROGRESS -> nextStatus == TicketStatus.RESOLVED || nextStatus == TicketStatus.REJECTED;
            case RESOLVED, REJECTED -> nextStatus == TicketStatus.CLOSED;
            case CLOSED -> false;
        };
        if (!allowed) {
            throw new BadRequestException("Invalid ticket status transition.");
        }
    }

    private boolean isAdmin(UserEntity user) {
        return user.getUserType() == UserType.ADMIN;
    }

    private boolean isTicketManager(UserEntity user) {
        return user.getUserType() == UserType.MANAGER
                && user.getManagerProfile() != null
                && user.getManagerProfile().getManagerRole() == ManagerRole.TICKET_MANAGER;
    }

    private boolean isTicketManagerOrAdmin(UserEntity user) {
        return isAdmin(user) || isTicketManager(user);
    }

    private String resolveAssignedToName(UserEntity user) {
        if (user == null) return null;
        if (isAdmin(user) && user.getAdminProfile() != null) {
            return user.getAdminProfile().getFullName();
        }
        if (isTicketManager(user) && user.getManagerProfile() != null) {
            if (user.getManagerProfile().getPreferredName() != null
                    && !user.getManagerProfile().getPreferredName().isBlank()) {
                return user.getManagerProfile().getPreferredName();
            }
            String first = user.getManagerProfile().getFirstName() != null ? user.getManagerProfile().getFirstName() : "";
            String last = user.getManagerProfile().getLastName() != null ? user.getManagerProfile().getLastName() : "";
            String full = (first + " " + last).trim();
            return full.isBlank() ? user.getEmail() : full;
        }
        return user.getEmail();
    }

    private TicketSummaryResponse toTicketSummaryResponse(TicketEntity ticket) {
        return new TicketSummaryResponse(
                ticket.getId(),
                ticket.getTicketCode(),
                ticket.getTitle(),
                ticket.getDescription(),
                ticket.getCategory(),
                ticket.getPriority(),
                ticket.getStatus(),
                ticket.getReportedBy().getId(),
                ticket.getReportedBy().getEmail(),
                ticket.getAssignedTo() != null ? ticket.getAssignedTo().getId() : null,
                resolveAssignedToName(ticket.getAssignedTo()),
                ticket.getCreatedAt());
    }

    private TicketResponse toTicketResponse(TicketEntity ticket) {
        return new TicketResponse(
                ticket.getId(),
                ticket.getTicketCode(),
                ticket.getTitle(),
                ticket.getDescription(),
                ticket.getCategory(),
                ticket.getPriority(),
                ticket.getStatus(),
                ticket.getReportedBy().getId(),
                ticket.getReportedBy().getEmail(),
                ticket.getAssignedTo() != null ? ticket.getAssignedTo().getId() : null,
                ticket.getAssignedTo() != null ? ticket.getAssignedTo().getEmail() : null,
                resolveAssignedToName(ticket.getAssignedTo()),
                ticket.getResourceId(),
                ticket.getLocationId(),
                ticket.getResolutionNotes(),
                ticket.getRejectionReason(),
                ticket.getContactNote(),
                ticket.getResolvedAt(),
                ticket.getClosedAt(),
                ticket.getCreatedAt(),
                ticket.getUpdatedAt());
    }

    private TicketCommentResponse toCommentResponse(TicketCommentEntity comment) {
        return new TicketCommentResponse(
                comment.getId(),
                comment.getTicket().getId(),
                comment.getUser().getId(),
                comment.getUser().getEmail(),
                comment.getCommentText(),
                comment.isEdited(),
                comment.getCreatedAt(),
                comment.getUpdatedAt());
    }

    private TicketAttachmentResponse toAttachmentResponse(TicketAttachmentEntity attachment) {
        return new TicketAttachmentResponse(
                attachment.getId(),
                attachment.getTicket().getId(),
                attachment.getFileName(),
                attachment.getFileUrl(),
                attachment.getFileType(),
                attachment.getUploadedAt());
    }

    private TicketStatusHistoryResponse toHistoryResponse(TicketStatusHistoryEntity history) {
        return new TicketStatusHistoryResponse(
                history.getId(),
                history.getTicket().getId(),
                history.getOldStatus(),
                history.getNewStatus(),
                history.getChangedBy().getId(),
                history.getChangedBy().getEmail(),
                history.getNote(),
                history.getChangedAt());
    }
}
