package com.university.smartcampus.ticket.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.university.smartcampus.ticket.entity.TicketCommentEntity;

public interface TicketCommentRepository extends JpaRepository<TicketCommentEntity, UUID> {

    List<TicketCommentEntity> findByTicketIdOrderByCreatedAtAsc(UUID ticketId);
}
