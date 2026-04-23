package com.university.smartcampus.ticket.assembler;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;

import java.util.List;
import java.util.UUID;

import org.springframework.core.ParameterizedTypeReference;
import org.springframework.hateoas.CollectionModel;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.Link;
import org.springframework.stereotype.Component;

import com.university.smartcampus.common.enums.AppEnums.ManagerRole;
import com.university.smartcampus.common.enums.AppEnums.TicketCategory;
import com.university.smartcampus.common.enums.AppEnums.TicketPriority;
import com.university.smartcampus.common.enums.AppEnums.TicketStatus;
import com.university.smartcampus.common.enums.AppEnums.UserType;
import com.university.smartcampus.ticket.controller.TicketController;
import com.university.smartcampus.ticket.dto.TicketDtos.TicketAttachmentResponse;
import com.university.smartcampus.ticket.dto.TicketDtos.TicketCommentResponse;
import com.university.smartcampus.ticket.dto.TicketDtos.TicketListScope;
import com.university.smartcampus.ticket.dto.TicketDtos.TicketResponse;
import com.university.smartcampus.ticket.dto.TicketDtos.TicketStatusHistoryResponse;
import com.university.smartcampus.ticket.dto.TicketDtos.TicketSummaryResponse;
import com.university.smartcampus.user.entity.UserEntity;

@Component
public class TicketModelAssembler {

    public CollectionModel<EntityModel<TicketSummaryResponse>> toTicketSummaryCollection(
            UserEntity actor,
            List<TicketSummaryResponse> tickets,
            TicketStatus status,
            TicketCategory category,
            TicketPriority priority,
            TicketListScope scope) {
        List<EntityModel<TicketSummaryResponse>> models = tickets.stream()
                .map(ticket -> toTicketSummaryModel(actor, ticket))
                .toList();

        return CollectionModel.of(models,
                        linkTo(methodOn(TicketController.class).listTickets(status, category, priority, scope, null))
                                .withSelfRel())
                .withFallbackType(new ParameterizedTypeReference<EntityModel<TicketSummaryResponse>>() {});
    }

    public EntityModel<TicketSummaryResponse> toTicketSummaryModel(UserEntity actor, TicketSummaryResponse ticket) {
        EntityModel<TicketSummaryResponse> model = EntityModel.of(ticket);
        addTicketLinks(model, actor, context(ticket));
        return model;
    }

    public EntityModel<TicketResponse> toTicketModel(UserEntity actor, TicketResponse ticket) {
        EntityModel<TicketResponse> model = EntityModel.of(ticket);
        addTicketLinks(model, actor, context(ticket));
        return model;
    }

    public CollectionModel<EntityModel<TicketCommentResponse>> toCommentCollection(
            UserEntity actor,
            TicketResponse ticket,
            List<TicketCommentResponse> comments) {
        TicketContext ticketContext = context(ticket);
        UUID latestCommentId = comments.isEmpty() ? null : comments.get(comments.size() - 1).id();
        List<EntityModel<TicketCommentResponse>> models = comments.stream()
                .map(comment -> toCommentModel(actor, ticketContext, comment, latestCommentId))
                .toList();

        CollectionModel<EntityModel<TicketCommentResponse>> collection = CollectionModel.of(models,
                        linkTo(methodOn(TicketController.class).listComments(ticketContext.ticketCode(), null)).withSelfRel(),
                        ticketSelfLink(ticketContext.ticketCode()).withRel("ticket"))
                .withFallbackType(new ParameterizedTypeReference<EntityModel<TicketCommentResponse>>() {});
        collection.addIf(canAddComment(actor, ticketContext),
                () -> linkTo(methodOn(TicketController.class).addComment(ticketContext.ticketCode(), null, null))
                        .withRel("add-comment"));
        return collection;
    }

    public EntityModel<TicketCommentResponse> toCommentModel(
            UserEntity actor,
            TicketResponse ticket,
            TicketCommentResponse comment,
            UUID latestCommentId) {
        return toCommentModel(actor, context(ticket), comment, latestCommentId);
    }

    private EntityModel<TicketCommentResponse> toCommentModel(
            UserEntity actor,
            TicketContext ticket,
            TicketCommentResponse comment,
            UUID latestCommentId) {
        boolean latest = comment.id().equals(latestCommentId);
        EntityModel<TicketCommentResponse> model = EntityModel.of(comment,
                linkTo(methodOn(TicketController.class).getComment(ticket.ticketCode(), comment.id(), null))
                        .withSelfRel(),
                ticketSelfLink(ticket.ticketCode()).withRel("ticket"),
                linkTo(methodOn(TicketController.class).listComments(ticket.ticketCode(), null)).withRel("comments"));
        model.addIf(canEditComment(actor, comment, latest),
                () -> linkTo(methodOn(TicketController.class)
                        .updateComment(ticket.ticketCode(), comment.id(), null, null))
                        .withRel("edit-comment"));
        model.addIf(canDeleteComment(actor, comment, latest),
                () -> commentPath(ticket.ticketCode(), comment.id()).withRel("delete-comment"));
        return model;
    }

    public CollectionModel<EntityModel<TicketAttachmentResponse>> toAttachmentCollection(
            UserEntity actor,
            TicketResponse ticket,
            List<TicketAttachmentResponse> attachments) {
        TicketContext ticketContext = context(ticket);
        List<EntityModel<TicketAttachmentResponse>> models = attachments.stream()
                .map(attachment -> toAttachmentModel(actor, ticketContext, attachment))
                .toList();

        CollectionModel<EntityModel<TicketAttachmentResponse>> collection = CollectionModel.of(models,
                        linkTo(methodOn(TicketController.class).listAttachments(ticketContext.ticketCode(), null)).withSelfRel(),
                        ticketSelfLink(ticketContext.ticketCode()).withRel("ticket"))
                .withFallbackType(new ParameterizedTypeReference<EntityModel<TicketAttachmentResponse>>() {});
        addAttachmentCreationLinks(collection, actor, ticketContext);
        return collection;
    }

    public EntityModel<TicketAttachmentResponse> toAttachmentModel(
            UserEntity actor,
            TicketResponse ticket,
            TicketAttachmentResponse attachment) {
        return toAttachmentModel(actor, context(ticket), attachment);
    }

    private EntityModel<TicketAttachmentResponse> toAttachmentModel(
            UserEntity actor,
            TicketContext ticket,
            TicketAttachmentResponse attachment) {
        EntityModel<TicketAttachmentResponse> model = EntityModel.of(attachment,
                linkTo(methodOn(TicketController.class).getAttachment(ticket.ticketCode(), attachment.id(), null))
                        .withSelfRel(),
                ticketSelfLink(ticket.ticketCode()).withRel("ticket"),
                linkTo(methodOn(TicketController.class).listAttachments(ticket.ticketCode(), null))
                        .withRel("attachments"));
        model.addIf(canManageAttachments(actor, ticket),
                () -> attachmentPath(ticket.ticketCode(), attachment.id()).withRel("delete-attachment"));
        return model;
    }

    public CollectionModel<EntityModel<TicketStatusHistoryResponse>> toStatusHistoryCollection(
            TicketResponse ticket,
            List<TicketStatusHistoryResponse> history) {
        TicketContext ticketContext = context(ticket);
        List<EntityModel<TicketStatusHistoryResponse>> models = history.stream()
                .map(entry -> toStatusHistoryModel(ticketContext, entry))
                .toList();

        return CollectionModel.of(models,
                        linkTo(methodOn(TicketController.class).getStatusHistory(ticketContext.ticketCode(), null))
                                .withSelfRel(),
                        ticketSelfLink(ticketContext.ticketCode()).withRel("ticket"))
                .withFallbackType(new ParameterizedTypeReference<EntityModel<TicketStatusHistoryResponse>>() {});
    }

    public EntityModel<TicketStatusHistoryResponse> toStatusHistoryModel(
            TicketResponse ticket,
            TicketStatusHistoryResponse history) {
        return toStatusHistoryModel(context(ticket), history);
    }

    private EntityModel<TicketStatusHistoryResponse> toStatusHistoryModel(
            TicketContext ticket,
            TicketStatusHistoryResponse history) {
        return EntityModel.of(history,
                linkTo(methodOn(TicketController.class)
                        .getStatusHistoryEntry(ticket.ticketCode(), history.id(), null))
                        .withSelfRel(),
                ticketSelfLink(ticket.ticketCode()).withRel("ticket"),
                linkTo(methodOn(TicketController.class).getStatusHistory(ticket.ticketCode(), null))
                        .withRel("history"));
    }

    private void addTicketLinks(EntityModel<?> model, UserEntity actor, TicketContext ticket) {
        String ticketRef = ticket.ticketCode();
        model.add(
                ticketSelfLink(ticketRef),
                linkTo(methodOn(TicketController.class).listTickets(null, null, null, null, null)).withRel("tickets"),
                linkTo(methodOn(TicketController.class).listComments(ticketRef, null)).withRel("comments"),
                linkTo(methodOn(TicketController.class).listAttachments(ticketRef, null)).withRel("attachments"),
                linkTo(methodOn(TicketController.class).getStatusHistory(ticketRef, null)).withRel("history"));

        model.addIf(canUpdateTicket(actor, ticket),
                () -> linkTo(methodOn(TicketController.class).updateTicket(ticketRef, null, null))
                        .withRel("update-ticket"));
        model.addIf(canDeleteTicket(actor, ticket),
                () -> linkTo(TicketController.class).slash(ticketRef).withRel("delete-ticket"));
        model.addIf(canAssignTicket(actor, ticket),
                () -> linkTo(methodOn(TicketController.class).assignTicket(ticketRef, null, null))
                        .withRel("assign-ticket"));
        model.addIf(canUpdateStatus(actor, ticket),
                () -> linkTo(methodOn(TicketController.class).updateStatus(ticketRef, null, null))
                        .withRel("update-status"));
        model.addIf(canAddComment(actor, ticket),
                () -> linkTo(methodOn(TicketController.class).addComment(ticketRef, null, null))
                        .withRel("add-comment"));
        addAttachmentCreationLinks(model, actor, ticket);
    }

    private void addAttachmentCreationLinks(CollectionModel<?> model, UserEntity actor, TicketContext ticket) {
        if (!canManageAttachments(actor, ticket)) {
            return;
        }
        String ticketRef = ticket.ticketCode();
        model.add(
                linkTo(methodOn(TicketController.class).addAttachment(ticketRef, null, null))
                        .withRel("add-attachment-metadata"),
                linkTo(methodOn(TicketController.class).uploadAttachment(ticketRef, null, null))
                        .withRel("upload-attachment"));
    }

    private void addAttachmentCreationLinks(EntityModel<?> model, UserEntity actor, TicketContext ticket) {
        if (!canManageAttachments(actor, ticket)) {
            return;
        }
        String ticketRef = ticket.ticketCode();
        model.add(
                linkTo(methodOn(TicketController.class).addAttachment(ticketRef, null, null))
                        .withRel("add-attachment-metadata"),
                linkTo(methodOn(TicketController.class).uploadAttachment(ticketRef, null, null))
                        .withRel("upload-attachment"));
    }

    private Link ticketSelfLink(String ticketRef) {
        return linkTo(methodOn(TicketController.class).getTicket(ticketRef, null)).withSelfRel();
    }

    private Link commentPath(String ticketRef, UUID commentId) {
        return linkTo(TicketController.class).slash(ticketRef).slash("comments").slash(commentId).withSelfRel();
    }

    private Link attachmentPath(String ticketRef, UUID attachmentId) {
        return linkTo(TicketController.class).slash(ticketRef).slash("attachments").slash(attachmentId).withSelfRel();
    }

    private boolean canUpdateTicket(UserEntity actor, TicketContext ticket) {
        return isReporter(actor, ticket) && ticket.status() == TicketStatus.OPEN;
    }

    private boolean canDeleteTicket(UserEntity actor, TicketContext ticket) {
        if (isAdmin(actor)) {
            return ticket.status() == TicketStatus.CLOSED;
        }
        return isReporter(actor, ticket) && ticket.assignedToId() == null;
    }

    private boolean canAssignTicket(UserEntity actor, TicketContext ticket) {
        return isAdmin(actor) && ticket.status() == TicketStatus.OPEN;
    }

    private boolean canUpdateStatus(UserEntity actor, TicketContext ticket) {
        return isTicketManagerOrAdmin(actor)
                && isAssignedTo(actor, ticket)
                && ticket.status() != TicketStatus.CLOSED;
    }

    private boolean canAddComment(UserEntity actor, TicketContext ticket) {
        if (ticket.status() == TicketStatus.CLOSED || ticket.status() == TicketStatus.REJECTED) {
            return false;
        }
        if (isAdmin(actor)) {
            return ticket.status() == TicketStatus.IN_PROGRESS;
        }
        if (isReporter(actor, ticket)) {
            return true;
        }
        if (isTicketManager(actor)) {
            return isAssignedTo(actor, ticket) && ticket.status() != TicketStatus.OPEN;
        }
        return false;
    }

    private boolean canManageAttachments(UserEntity actor, TicketContext ticket) {
        return ticket.status() == TicketStatus.OPEN
                && (isReporter(actor, ticket) || (isTicketManager(actor) && isAssignedTo(actor, ticket)));
    }

    private boolean canEditComment(UserEntity actor, TicketCommentResponse comment, boolean latest) {
        return latest && comment.userId().equals(actor.getId());
    }

    private boolean canDeleteComment(UserEntity actor, TicketCommentResponse comment, boolean latest) {
        return latest && (isAdmin(actor) || comment.userId().equals(actor.getId()));
    }

    private boolean isReporter(UserEntity actor, TicketContext ticket) {
        return ticket.reportedById() != null && ticket.reportedById().equals(actor.getId());
    }

    private boolean isAssignedTo(UserEntity actor, TicketContext ticket) {
        return ticket.assignedToId() != null && ticket.assignedToId().equals(actor.getId());
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

    private TicketContext context(TicketSummaryResponse ticket) {
        return new TicketContext(
                ticket.id(),
                ticket.ticketCode(),
                ticket.status(),
                ticket.reportedById(),
                ticket.assignedToId());
    }

    private TicketContext context(TicketResponse ticket) {
        return new TicketContext(
                ticket.id(),
                ticket.ticketCode(),
                ticket.status(),
                ticket.reportedById(),
                ticket.assignedToId());
    }

    private record TicketContext(
            UUID id,
            String ticketCode,
            TicketStatus status,
            UUID reportedById,
            UUID assignedToId) {
    }
}
