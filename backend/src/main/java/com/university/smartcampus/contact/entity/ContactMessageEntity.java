package com.university.smartcampus.contact.entity;

import java.util.UUID;

import com.university.smartcampus.common.entity.TimestampedEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "contact_messages")
public class ContactMessageEntity extends TimestampedEntity {

    @Id
    private UUID id;

    @Column(name = "full_name", nullable = false, length = 200)
    private String fullName;

    @Column(nullable = false, length = 320)
    private String email;

    @Column(length = 50)
    private String phone;

    @Column(nullable = false, length = 300)
    private String title;

    @Column(nullable = false, columnDefinition = "text")
    private String message;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
