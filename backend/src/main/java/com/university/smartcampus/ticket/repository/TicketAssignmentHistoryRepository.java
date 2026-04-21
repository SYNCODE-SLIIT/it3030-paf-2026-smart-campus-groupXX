package com.university.smartcampus.ticket.repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.university.smartcampus.ticket.entity.TicketAssignmentHistoryEntity;

public interface TicketAssignmentHistoryRepository extends JpaRepository<TicketAssignmentHistoryEntity, UUID> {

    List<TicketAssignmentHistoryEntity> findByTicketIdInOrderByChangedAtAsc(Collection<UUID> ticketIds);
}
