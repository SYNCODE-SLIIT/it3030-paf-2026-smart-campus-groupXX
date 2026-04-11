package com.university.smartcampus;

import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "managers")
public class ManagerEntity extends TimestampedEntity {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @MapsId
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private UserEntity user;

    @Column(name = "first_name", nullable = false, length = 100)
    private String firstName;

    @Column(name = "last_name", nullable = false, length = 100)
    private String lastName;

    @Column(name = "preferred_name", length = 100)
    private String preferredName;

    @Column(name = "phone_number", length = 30)
    private String phoneNumber;

    @Column(name = "employee_number", nullable = false, length = 100)
    private String employeeNumber;

    @Column(nullable = false, length = 150)
    private String department;

    @Column(name = "job_title", nullable = false, length = 150)
    private String jobTitle;

    @Column(name = "office_location", length = 150)
    private String officeLocation;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "manager_roles", nullable = false, columnDefinition = "varchar(30)[]")
    private String[] managerRoleCodes = new String[0];

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public UserEntity getUser() {
        return user;
    }

    public void setUser(UserEntity user) {
        this.user = user;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getPreferredName() {
        return preferredName;
    }

    public void setPreferredName(String preferredName) {
        this.preferredName = preferredName;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getEmployeeNumber() {
        return employeeNumber;
    }

    public void setEmployeeNumber(String employeeNumber) {
        this.employeeNumber = employeeNumber;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public String getJobTitle() {
        return jobTitle;
    }

    public void setJobTitle(String jobTitle) {
        this.jobTitle = jobTitle;
    }

    public String getOfficeLocation() {
        return officeLocation;
    }

    public void setOfficeLocation(String officeLocation) {
        this.officeLocation = officeLocation;
    }

    public Set<AppEnums.ManagerRole> getManagerRoles() {
        if (managerRoleCodes == null || managerRoleCodes.length == 0) {
            return Set.of();
        }

        Set<AppEnums.ManagerRole> roles = new LinkedHashSet<>();
        Arrays.stream(managerRoleCodes)
            .filter(Objects::nonNull)
            .map(AppEnums.ManagerRole::valueOf)
            .forEach(roles::add);
        return roles;
    }

    public void setManagerRoles(Set<AppEnums.ManagerRole> managerRoles) {
        this.managerRoleCodes = managerRoles == null
            ? new String[0]
            : managerRoles.stream()
                .filter(Objects::nonNull)
                .map(Enum::name)
                .sorted()
                .toArray(String[]::new);
    }

    public boolean hasManagerRole(AppEnums.ManagerRole role) {
        return role != null && Arrays.stream(managerRoleCodes == null ? new String[0] : managerRoleCodes)
            .anyMatch(role.name()::equals);
    }
}
