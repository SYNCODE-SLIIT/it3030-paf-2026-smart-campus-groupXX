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

import com.university.smartcampus.common.enums.AppEnums.ManagerRole;
import com.university.smartcampus.common.enums.AppEnums.TicketCategory;
import com.university.smartcampus.common.enums.AppEnums.TicketPriority;
import com.university.smartcampus.common.enums.AppEnums.TicketStatus;
import com.university.smartcampus.common.enums.AppEnums.UserType;
import com.university.smartcampus.common.exception.BadRequestException;
import com.university.smartcampus.common.exception.ForbiddenException;
import com.university.smartcampus.common.exception.NotFoundException;
import com.university.smartcampus.ticket.dto.TicketDtos.AddCommentRequest;
import com.university.smartcampus.ticket.dto.TicketDtos.AddTicketAttachmentRequest;
import com.university.smartcampus.ticket.dto.TicketDtos.CreateTicketRequest;
import com.university.smartcampus.ticket.dto.TicketDtos.TicketAttachmentResponse;
import com.university.smartcampus.ticket.dto.TicketDtos.TicketCommentResponse;
import com.university.smartcampus.ticket.dto.TicketDtos.TicketResponse;
import com.university.smartcampus.ticket.dto.TicketDtos.TicketStatusHistoryResponse;
import com.university.smartcampus.ticket.dto.TicketDtos.TicketStatusUpdateRequest;
import com.university.smartcampus.ticket.dto.TicketDtos.TicketSummaryResponse;
import com.university.smartcampus.ticket.dto.TicketDtos.UpdateTicketRequest;
import com.university.smartcampus.ticket.entity.TicketAttachmentEntity;
import com.university.smartcampus.ticket.entity.TicketCommentEntity;
import com.university.smartcampus.ticket.entity.TicketEntity;
import com.university.smartcampus.ticket.entity.TicketStatusHistoryEntity;
import com.university.smartcampus.ticket.repository.TicketAttachmentRepository;
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
    private final TicketCommentRepository ticketCommentRepository;
    private final TicketStatusHistoryRepository ticketStatusHistoryRepository;
    private final TicketAttachmentStorageClient ticketAttachmentStorageClient;
    private final UserRepository userRepository;

    public TicketService(
            TicketRepository ticketRepository,
            TicketAttachmentRepository ticketAttachmentRepository,
            TicketCommentRepository ticketCommentRepository,
            TicketStatusHistoryRepository ticketStatusHistoryRepository,
            TicketAttachmentStorageClient ticketAttachmentStorageClient,
            UserRepository userRepository) {
        this.ticketRepository = ticketRepository;
        this.ticketAttachmentRepository = ticketAttachmentRepository;
        this.ticketCommentRepository = ticketCommentRepository;
        this.ticketStatusHistoryRepository = ticketStatusHistoryRepository;
        this.ticketAttachmentStorageClient = ticketAttachmentStorageClient;
        this.userRepository = userRepository;
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
        ticketRepository.save(ticket);

        recordHistory(ticket, null, TicketStatus.OPEN, reporter, null);

        return toTicketResponse(ticket);
    }

    @Transactional(readOnly = true)
    public List<TicketSummaryResponse> listTickets(
            UserEntity user,
            TicketStatus status,
            TicketCategory category,
            TicketPriority priority) {
        Specification<TicketEntity> spec = (root, query, cb) -> cb.conjunction();

        if (!isTicketManager(user)) {
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
    public TicketResponse getTicket(UserEntity user, UUID id) {
        TicketEntity ticket = requireAccessibleTicket(user, id);
        return toTicketResponse(ticket);
    }

    @Transactional
    public TicketResponse updateTicket(UserEntity user, UUID id, UpdateTicketRequest request) {
        TicketEntity ticket = getTicketEntity(id);

        if (!ticket.getReportedBy().getId().equals(user.getId())) {
            throw new ForbiddenException("You can only update your own tickets.");
        }
        if (ticket.getStatus() == TicketStatus.CLOSED || ticket.getStatus() == TicketStatus.REJECTED) {
            throw new BadRequestException("Cannot update a ticket that is closed or rejected.");
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
    public TicketResponse updateStatus(UserEntity manager, UUID id, TicketStatusUpdateRequest request) {
        if (!isTicketManager(manager)) {
            throw new ForbiddenException("Ticket manager access is required.");
        }

        TicketEntity ticket = getTicketEntity(id);

        if (ticket.getStatus() == TicketStatus.CLOSED) {
            throw new BadRequestException("Closed tickets cannot be updated.");
        }
        if (request.newStatus() == TicketStatus.OPEN) {
            throw new BadRequestException("Cannot transition a ticket back to OPEN.");
        }
        if (request.newStatus() == TicketStatus.REJECTED && !StringUtils.hasText(request.rejectionReason())) {
            throw new BadRequestException("Rejection reason is required when rejecting a ticket.");
        }
        if (request.newStatus() == TicketStatus.RESOLVED && !StringUtils.hasText(request.resolutionNotes())) {
            throw new BadRequestException("Resolution notes are required when resolving a ticket.");
        }

        TicketStatus oldStatus = ticket.getStatus();
        ticket.setStatus(request.newStatus());

        if (request.assignedTo() != null) {
            UserEntity assignee = userRepository.findById(request.assignedTo())
                    .orElseThrow(() -> new NotFoundException("Assigned user not found."));
            ticket.setAssignedTo(assignee);
        }

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

        return toTicketResponse(ticket);
    }

    @Transactional
    public TicketCommentResponse addComment(UserEntity user, UUID id, AddCommentRequest request) {
        TicketEntity ticket = requireAccessibleTicket(user, id);

        TicketCommentEntity comment = new TicketCommentEntity();
        comment.setId(UUID.randomUUID());
        comment.setTicket(ticket);
        comment.setUser(user);
        comment.setCommentText(request.commentText());
        comment.setEdited(false);
        ticketCommentRepository.save(comment);

        return toCommentResponse(comment);
    }

    @Transactional(readOnly = true)
    public List<TicketCommentResponse> listComments(UserEntity user, UUID id) {
        requireAccessibleTicket(user, id);
        return ticketCommentRepository.findByTicketIdOrderByCreatedAtAsc(id)
                .stream()
                .map(this::toCommentResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TicketStatusHistoryResponse> getStatusHistory(UserEntity user, UUID id) {
        requireAccessibleTicket(user, id);
        return ticketStatusHistoryRepository.findByTicketIdOrderByChangedAtAsc(id)
                .stream()
                .map(this::toHistoryResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TicketAttachmentResponse> listAttachments(UserEntity user, UUID id) {
        requireAccessibleTicket(user, id);
        return ticketAttachmentRepository.findByTicketIdOrderByUploadedAtAsc(id)
                .stream()
                .map(this::toAttachmentResponse)
                .toList();
    }

    @Transactional
    public TicketAttachmentResponse addAttachment(UserEntity user, UUID id, AddTicketAttachmentRequest request) {
        TicketEntity ticket = requireAccessibleTicket(user, id);

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
    public TicketAttachmentResponse uploadAttachment(UserEntity user, UUID id, MultipartFile file) {
        TicketEntity ticket = requireAccessibleTicket(user, id);
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
    public void deleteAttachment(UserEntity user, UUID id, UUID attachmentId) {
        requireAccessibleTicket(user, id);
        TicketAttachmentEntity attachment = ticketAttachmentRepository.findByIdAndTicketId(attachmentId, id)
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

    private TicketEntity requireAccessibleTicket(UserEntity user, UUID id) {
        TicketEntity ticket = getTicketEntity(id);
        if (!isTicketManager(user) && !ticket.getReportedBy().getId().equals(user.getId())) {
            throw new ForbiddenException("You do not have access to this ticket.");
        }
        return ticket;
    }

    private TicketEntity getTicketEntity(UUID id) {
        return ticketRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Ticket not found."));
    }

    private boolean isTicketManager(UserEntity user) {
        return user.getUserType() == UserType.MANAGER
                && user.getManagerProfile() != null
                && user.getManagerProfile().getManagerRole() == ManagerRole.TICKET_MANAGER;
    }

    private TicketSummaryResponse toTicketSummaryResponse(TicketEntity ticket) {
        return new TicketSummaryResponse(
                ticket.getId(),
                ticket.getTicketCode(),
                ticket.getTitle(),
                ticket.getCategory(),
                ticket.getPriority(),
                ticket.getStatus(),
                ticket.getReportedBy().getId(),
                ticket.getReportedBy().getEmail(),
                ticket.getAssignedTo() != null ? ticket.getAssignedTo().getId() : null,
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
