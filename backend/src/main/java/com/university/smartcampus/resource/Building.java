package com.university.smartcampus.resource;

import java.util.UUID;

import com.university.smartcampus.AppEnums.BuildingType;
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
@Table(name = "buildings")
public class Building extends TimestampedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "building_name", nullable = false, length = 150, unique = true)
    private String buildingName;

    @Column(name = "building_code", nullable = false, length = 50, unique = true)
    private String buildingCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "building_type", nullable = false, length = 50)
    private BuildingType buildingType;

    @Column(name = "has_wings", nullable = false)
    private boolean hasWings;

    @Column(name = "left_wing_prefix", length = 20)
    private String leftWingPrefix;

    @Column(name = "right_wing_prefix", length = 20)
    private String rightWingPrefix;

    @Column(name = "default_prefix", length = 20)
    private String defaultPrefix;

    @Column(columnDefinition = "text")
    private String description;

    @Column(name = "is_active", nullable = false)
    private boolean active;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getBuildingName() {
        return buildingName;
    }

    public void setBuildingName(String buildingName) {
        this.buildingName = buildingName;
    }

    public String getBuildingCode() {
        return buildingCode;
    }

    public void setBuildingCode(String buildingCode) {
        this.buildingCode = buildingCode;
    }

    public BuildingType getBuildingType() {
        return buildingType;
    }

    public void setBuildingType(BuildingType buildingType) {
        this.buildingType = buildingType;
    }

    public boolean isHasWings() {
        return hasWings;
    }

    public void setHasWings(boolean hasWings) {
        this.hasWings = hasWings;
    }

    public String getLeftWingPrefix() {
        return leftWingPrefix;
    }

    public void setLeftWingPrefix(String leftWingPrefix) {
        this.leftWingPrefix = leftWingPrefix;
    }

    public String getRightWingPrefix() {
        return rightWingPrefix;
    }

    public void setRightWingPrefix(String rightWingPrefix) {
        this.rightWingPrefix = rightWingPrefix;
    }

    public String getDefaultPrefix() {
        return defaultPrefix;
    }

    public void setDefaultPrefix(String defaultPrefix) {
        this.defaultPrefix = defaultPrefix;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }
}
