package com.university.smartcampus.ticket.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import com.university.smartcampus.ticket.entity.TicketEntity;
import com.university.smartcampus.common.enums.AppEnums.TicketStatus;

public interface TicketRepository extends JpaRepository<TicketEntity, UUID>, JpaSpecificationExecutor<TicketEntity> {

    Optional<TicketEntity> findByTicketCodeIgnoreCase(String ticketCode);

    List<TicketEntity> findByAssignedToId(UUID assignedToId);

    List<TicketEntity> findByReportedById(UUID reportedById);

    List<TicketEntity> findByStatusIn(List<TicketStatus> statuses);

    @Query(value = "SELECT nextval('public.ticket_code_seq')", nativeQuery = true)
    Long nextTicketCodeSequence();
}
