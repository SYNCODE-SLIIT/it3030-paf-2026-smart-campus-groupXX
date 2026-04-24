package com.university.smartcampus.ticket.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.Collection;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.university.smartcampus.ticket.entity.TicketEntity;
import com.university.smartcampus.common.enums.AppEnums.TicketStatus;

public interface TicketRepository extends JpaRepository<TicketEntity, UUID>, JpaSpecificationExecutor<TicketEntity> {

    @Override
    @EntityGraph(attributePaths = {
        "reportedBy",
        "assignedTo",
        "assignedTo.adminProfile",
        "assignedTo.managerProfile",
        "resource",
        "location"
    })
    List<TicketEntity> findAll(Specification<TicketEntity> spec, Sort sort);

    Optional<TicketEntity> findByTicketCodeIgnoreCase(String ticketCode);

    List<TicketEntity> findByAssignedToId(UUID assignedToId);

    List<TicketEntity> findByReportedById(UUID reportedById);

    long countByStatus(TicketStatus status);

    List<TicketEntity> findByStatusIn(List<TicketStatus> statuses);

    @Query("""
        select (count(t) > 0)
        from TicketEntity t
        where t.resource.id = :resourceId
          and t.status in :statuses
        """)
    boolean existsByResourceIdAndStatusIn(
        @Param("resourceId") UUID resourceId,
        @Param("statuses") List<TicketStatus> statuses
    );

    @Query("""
        select t
        from TicketEntity t
        where t.resource.id = :resourceId
        """)
    List<TicketEntity> findAllByResourceId(@Param("resourceId") UUID resourceId);

    @Query(value = "SELECT nextval('public.ticket_code_seq')", nativeQuery = true)
    Long nextTicketCodeSequence();
}
