package com.university.smartcampus.ticket.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.university.smartcampus.ticket.entity.TicketAttachmentEntity;

public interface TicketAttachmentRepository extends JpaRepository<TicketAttachmentEntity, UUID> {

    List<TicketAttachmentEntity> findByTicketIdOrderByUploadedAtAsc(UUID ticketId);

    Optional<TicketAttachmentEntity> findByIdAndTicketId(UUID id, UUID ticketId);

    long countByTicketId(UUID ticketId);
}
