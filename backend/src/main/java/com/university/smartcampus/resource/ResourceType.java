package com.university.smartcampus.resource;

import java.util.UUID;

import com.university.smartcampus.AppEnums.ResourceCategory;
import com.university.smartcampus.common.entity.TimestampedEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "resource_types")
public class ResourceType extends TimestampedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 50, unique = true)
    private String code;

    @Column(nullable = false, length = 100, unique = true)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private ResourceCategory category;

    @Column(columnDefinition = "text")
    private String description;

    @Column(name = "is_bookable_default", nullable = false)
    private boolean bookableDefault;

    @Column(name = "is_movable_default", nullable = false)
    private boolean movableDefault;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public ResourceCategory getCategory() {
        return category;
    }

    public void setCategory(ResourceCategory category) {
        this.category = category;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public boolean isBookableDefault() {
        return bookableDefault;
    }

    public void setBookableDefault(boolean bookableDefault) {
        this.bookableDefault = bookableDefault;
    }

    public boolean isMovableDefault() {
        return movableDefault;
    }

    public void setMovableDefault(boolean movableDefault) {
        this.movableDefault = movableDefault;
    }
}
