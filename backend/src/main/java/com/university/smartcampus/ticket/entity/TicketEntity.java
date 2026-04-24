package com.university.smartcampus.ticket.entity;

import java.time.Instant;
import java.util.UUID;

import com.university.smartcampus.common.entity.TimestampedEntity;
import com.university.smartcampus.common.enums.AppEnums.TicketCategory;
import com.university.smartcampus.common.enums.AppEnums.TicketPriority;
import com.university.smartcampus.common.enums.AppEnums.TicketStatus;
import com.university.smartcampus.resource.Location;
import com.university.smartcampus.resource.ResourceEntity;
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
import jakarta.persistence.Transient;

@Entity
@Table(name = "tickets")
public class TicketEntity extends TimestampedEntity {

    @Id
    private UUID id;

    @Column(name = "ticket_code", nullable = false, unique = true, length = 20)
    private String ticketCode;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(nullable = false, columnDefinition = "text")
    private String description;

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType.class)
    @Column(nullable = false, columnDefinition = "ticket_category_enum")
    private TicketCategory category;

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType.class)
    @Column(nullable = false, columnDefinition = "ticket_priority_enum")
    private TicketPriority priority;

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType.class)
    @Column(nullable = false, columnDefinition = "ticket_status_enum")
    private TicketStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reported_by", nullable = false)
    private UserEntity reportedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_to")
    private UserEntity assignedTo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resource_id")
    private ResourceEntity resource;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "location_id")
    private Location location;

    @Column(name = "resolution_notes", columnDefinition = "text")
    private String resolutionNotes;

    @Column(name = "rejection_reason", columnDefinition = "text")
    private String rejectionReason;

    @Column(name = "contact_note", columnDefinition = "text")
    private String contactNote;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @Column(name = "closed_at")
    private Instant closedAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getTicketCode() { return ticketCode; }
    public void setTicketCode(String ticketCode) { this.ticketCode = ticketCode; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public TicketCategory getCategory() { return category; }
    public void setCategory(TicketCategory category) { this.category = category; }

    public TicketPriority getPriority() { return priority; }
    public void setPriority(TicketPriority priority) { this.priority = priority; }

    public TicketStatus getStatus() { return status; }
    public void setStatus(TicketStatus status) { this.status = status; }

    public UserEntity getReportedBy() { return reportedBy; }
    public void setReportedBy(UserEntity reportedBy) { this.reportedBy = reportedBy; }

    public UserEntity getAssignedTo() { return assignedTo; }
    public void setAssignedTo(UserEntity assignedTo) { this.assignedTo = assignedTo; }

    public ResourceEntity getResource() { return resource; }
    public void setResource(ResourceEntity resource) { this.resource = resource; }

    @Transient
    public UUID resolveResourceId() { return resource == null ? null : resource.getId(); }

    public Location getLocation() { return location; }
    public void setLocation(Location location) { this.location = location; }

    @Transient
    public UUID resolveLocationId() { return location == null ? null : location.getId(); }

    public String getResolutionNotes() { return resolutionNotes; }
    public void setResolutionNotes(String resolutionNotes) { this.resolutionNotes = resolutionNotes; }

    public String getRejectionReason() { return rejectionReason; }
    public void setRejectionReason(String rejectionReason) { this.rejectionReason = rejectionReason; }

    public String getContactNote() { return contactNote; }
    public void setContactNote(String contactNote) { this.contactNote = contactNote; }

    public Instant getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(Instant resolvedAt) { this.resolvedAt = resolvedAt; }

    public Instant getClosedAt() { return closedAt; }
    public void setClosedAt(Instant closedAt) { this.closedAt = closedAt; }
}
