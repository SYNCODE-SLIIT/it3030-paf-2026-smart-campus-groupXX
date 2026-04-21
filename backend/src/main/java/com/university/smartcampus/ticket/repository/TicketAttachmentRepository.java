package com.university.smartcampus.ticket.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.university.smartcampus.ticket.entity.TicketAttachmentEntity;

public interface TicketAttachmentRepository extends JpaRepository<TicketAttachmentEntity, UUID> {

    List<TicketAttachmentEntity> findByTicketIdOrderByUploadedAtAsc(UUID ticketId);

    @Query("""
            select attachment.ticket.id, count(attachment)
            from TicketAttachmentEntity attachment
            where attachment.ticket.id in :ticketIds
            group by attachment.ticket.id
            """)
    List<Object[]> countByTicketIds(@Param("ticketIds") Collection<UUID> ticketIds);

    @Query("""
            select attachment.fileUrl
            from TicketAttachmentEntity attachment
            where attachment.ticket.id = :ticketId
            order by attachment.uploadedAt asc
            """)
    List<String> findFileUrlsByTicketId(@Param("ticketId") UUID ticketId);

    Optional<TicketAttachmentEntity> findByIdAndTicketId(UUID id, UUID ticketId);

    long countByTicketId(UUID ticketId);
}
