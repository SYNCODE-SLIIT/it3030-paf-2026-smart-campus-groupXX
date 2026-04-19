package com.university.smartcampus.booking;

import java.time.Instant;
import java.util.UUID;

import com.university.smartcampus.AppEnums.ModificationStatus;
import com.university.smartcampus.common.entity.TimestampedEntity;
import com.university.smartcampus.user.entity.UserEntity;

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
@Table(name = "booking_modifications")
public class BookingModificationEntity extends TimestampedEntity {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false)
    private BookingEntity booking;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "requested_by", nullable = false)
    private UserEntity requestedBy;

    @Column(name = "requested_start_time", nullable = false)
    private Instant requestedStartTime;

    @Column(name = "requested_end_time", nullable = false)
    private Instant requestedEndTime;

    @Column(name = "reason")
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ModificationStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "decided_by_id")
    private UserEntity decidedBy;

    @Column(name = "decision_reason", length = 500)
    private String decisionReason;

    @Column(name = "decided_at")
    private Instant decidedAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public BookingEntity getBooking() {
        return booking;
    }

    public void setBooking(BookingEntity booking) {
        this.booking = booking;
    }

    public UserEntity getRequestedBy() {
        return requestedBy;
    }

    public void setRequestedBy(UserEntity requestedBy) {
        this.requestedBy = requestedBy;
    }

    public Instant getRequestedStartTime() {
        return requestedStartTime;
    }

    public void setRequestedStartTime(Instant requestedStartTime) {
        this.requestedStartTime = requestedStartTime;
    }

    public Instant getRequestedEndTime() {
        return requestedEndTime;
    }

    public void setRequestedEndTime(Instant requestedEndTime) {
        this.requestedEndTime = requestedEndTime;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public ModificationStatus getStatus() {
        return status;
    }

    public void setStatus(ModificationStatus status) {
        this.status = status;
    }

    public UserEntity getDecidedBy() {
        return decidedBy;
    }

    public void setDecidedBy(UserEntity decidedBy) {
        this.decidedBy = decidedBy;
    }

    public String getDecisionReason() {
        return decisionReason;
    }

    public void setDecisionReason(String decisionReason) {
        this.decisionReason = decisionReason;
    }

    public Instant getDecidedAt() {
        return decidedAt;
    }

    public void setDecidedAt(Instant decidedAt) {
        this.decidedAt = decidedAt;
    }
}
