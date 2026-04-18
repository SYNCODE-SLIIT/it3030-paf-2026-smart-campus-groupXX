package com.university.smartcampus.ticket.entity;

import java.time.Instant;
import java.util.UUID;

import com.university.smartcampus.common.enums.AppEnums.TicketStatus;
import com.university.smartcampus.user.entity.UserEntity;

import org.hibernate.annotations.JdbcType;
import org.hibernate.dialect.type.PostgreSQLEnumJdbcType;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "ticket_status_history")
public class TicketStatusHistoryEntity {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_id", nullable = false)
    private TicketEntity ticket;

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType.class)
    @Column(name = "old_status", columnDefinition = "ticket_status_enum")
    private TicketStatus oldStatus;

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType.class)
    @Column(name = "new_status", nullable = false, columnDefinition = "ticket_status_enum")
    private TicketStatus newStatus;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "changed_by", nullable = false)
    private UserEntity changedBy;

    @Column(columnDefinition = "text")
    private String note;

    @Column(name = "changed_at", nullable = false)
    private Instant changedAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public TicketEntity getTicket() { return ticket; }
    public void setTicket(TicketEntity ticket) { this.ticket = ticket; }

    public TicketStatus getOldStatus() { return oldStatus; }
    public void setOldStatus(TicketStatus oldStatus) { this.oldStatus = oldStatus; }

    public TicketStatus getNewStatus() { return newStatus; }
    public void setNewStatus(TicketStatus newStatus) { this.newStatus = newStatus; }

    public UserEntity getChangedBy() { return changedBy; }
    public void setChangedBy(UserEntity changedBy) { this.changedBy = changedBy; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public Instant getChangedAt() { return changedAt; }
    public void setChangedAt(Instant changedAt) { this.changedAt = changedAt; }
}
