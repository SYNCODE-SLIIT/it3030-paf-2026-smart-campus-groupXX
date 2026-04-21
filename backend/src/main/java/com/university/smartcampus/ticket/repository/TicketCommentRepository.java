package com.university.smartcampus.ticket.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.university.smartcampus.ticket.entity.TicketCommentEntity;

public interface TicketCommentRepository extends JpaRepository<TicketCommentEntity, UUID> {

    List<TicketCommentEntity> findByTicketIdOrderByCreatedAtAscIdAsc(UUID ticketId);

    Optional<TicketCommentEntity> findByIdAndTicketId(UUID id, UUID ticketId);

    Optional<TicketCommentEntity> findFirstByTicketIdOrderByCreatedAtDescIdDesc(UUID ticketId);
}
