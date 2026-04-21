package com.university.smartcampus.ticket.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.university.smartcampus.ticket.entity.TicketStatusHistoryEntity;

public interface TicketStatusHistoryRepository extends JpaRepository<TicketStatusHistoryEntity, UUID> {

    List<TicketStatusHistoryEntity> findByTicketIdOrderByChangedAtAsc(UUID ticketId);

    List<TicketStatusHistoryEntity> findByTicketIdInOrderByChangedAtAsc(Collection<UUID> ticketIds);

    Optional<TicketStatusHistoryEntity> findByIdAndTicketId(UUID id, UUID ticketId);
}
