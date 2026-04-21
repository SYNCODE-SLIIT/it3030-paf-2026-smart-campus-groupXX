package com.university.smartcampus.ticket.entity;

import java.time.Instant;
import java.util.UUID;

import com.university.smartcampus.user.entity.UserEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "ticket_assignment_history")
public class TicketAssignmentHistoryEntity {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_id", nullable = false)
    private TicketEntity ticket;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "old_assignee")
    private UserEntity oldAssignee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "new_assignee")
    private UserEntity newAssignee;

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

    public UserEntity getOldAssignee() { return oldAssignee; }
    public void setOldAssignee(UserEntity oldAssignee) { this.oldAssignee = oldAssignee; }

    public UserEntity getNewAssignee() { return newAssignee; }
    public void setNewAssignee(UserEntity newAssignee) { this.newAssignee = newAssignee; }

    public UserEntity getChangedBy() { return changedBy; }
    public void setChangedBy(UserEntity changedBy) { this.changedBy = changedBy; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public Instant getChangedAt() { return changedAt; }
    public void setChangedAt(Instant changedAt) { this.changedAt = changedAt; }
}
