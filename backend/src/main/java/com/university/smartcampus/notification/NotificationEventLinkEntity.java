package com.university.smartcampus.notification;

import java.util.UUID;

import com.university.smartcampus.common.entity.TimestampedEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "notification_event_links")
public class NotificationEventLinkEntity extends TimestampedEntity {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_id", nullable = false)
    private NotificationEventEntity event;

    @Column(name = "ticket_id")
    private UUID ticketId;

    @Column(name = "ticket_comment_id")
    private UUID ticketCommentId;

    @Column(name = "booking_id")
    private UUID bookingId;

    @Column(name = "booking_modification_id")
    private UUID bookingModificationId;

    @Column(name = "resource_id")
    private UUID resourceId;

    @Column(name = "location_id")
    private UUID locationId;

    @Column(name = "building_id")
    private UUID buildingId;

    @Column(name = "resource_type_id")
    private UUID resourceTypeId;

    @Column(name = "user_id")
    private UUID userId;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public NotificationEventEntity getEvent() {
        return event;
    }

    public void setEvent(NotificationEventEntity event) {
        this.event = event;
    }

    public UUID getTicketId() {
        return ticketId;
    }

    public void setTicketId(UUID ticketId) {
        this.ticketId = ticketId;
    }

    public UUID getTicketCommentId() {
        return ticketCommentId;
    }

    public void setTicketCommentId(UUID ticketCommentId) {
        this.ticketCommentId = ticketCommentId;
    }

    public UUID getBookingId() {
        return bookingId;
    }

    public void setBookingId(UUID bookingId) {
        this.bookingId = bookingId;
    }

    public UUID getBookingModificationId() {
        return bookingModificationId;
    }

    public void setBookingModificationId(UUID bookingModificationId) {
        this.bookingModificationId = bookingModificationId;
    }

    public UUID getResourceId() {
        return resourceId;
    }

    public void setResourceId(UUID resourceId) {
        this.resourceId = resourceId;
    }

    public UUID getLocationId() {
        return locationId;
    }

    public void setLocationId(UUID locationId) {
        this.locationId = locationId;
    }

    public UUID getBuildingId() {
        return buildingId;
    }

    public void setBuildingId(UUID buildingId) {
        this.buildingId = buildingId;
    }

    public UUID getResourceTypeId() {
        return resourceTypeId;
    }

    public void setResourceTypeId(UUID resourceTypeId) {
        this.resourceTypeId = resourceTypeId;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }
}
