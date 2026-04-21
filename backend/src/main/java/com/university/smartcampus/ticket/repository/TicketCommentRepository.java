package com.university.smartcampus.ticket.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.university.smartcampus.ticket.entity.TicketCommentEntity;

public interface TicketCommentRepository extends JpaRepository<TicketCommentEntity, UUID> {

    List<TicketCommentEntity> findByTicketIdOrderByCreatedAtAscIdAsc(UUID ticketId);

    @Query("""
            select comment.ticket.id, count(comment)
            from TicketCommentEntity comment
            where comment.ticket.id in :ticketIds
            group by comment.ticket.id
            """)
    List<Object[]> countByTicketIds(@Param("ticketIds") Collection<UUID> ticketIds);

    Optional<TicketCommentEntity> findByIdAndTicketId(UUID id, UUID ticketId);

    Optional<TicketCommentEntity> findFirstByTicketIdOrderByCreatedAtDescIdDesc(UUID ticketId);
}
