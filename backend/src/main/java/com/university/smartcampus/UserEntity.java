package com.university.smartcampus;

import java.time.Instant;
import java.util.UUID;

import com.university.smartcampus.AppEnums.AccountStatus;
import com.university.smartcampus.AppEnums.UserType;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "users")
public class UserEntity extends TimestampedEntity {

    @Id
    private UUID id;

    @Column(name = "auth_user_id", unique = true)
    private UUID authUserId;

    @Column(nullable = false, length = 255)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(name = "user_type", nullable = false, length = 20)
    private UserType userType;

    @Enumerated(EnumType.STRING)
    @Column(name = "account_status", nullable = false, length = 20)
    private AccountStatus accountStatus;

    @Column(name = "onboarding_completed", nullable = false)
    private boolean onboardingCompleted;

    @Column(name = "last_login_at")
    private Instant lastLoginAt;

    @Column(name = "invited_at", nullable = false)
    private Instant invitedAt;

    @Column(name = "activated_at")
    private Instant activatedAt;

    @Column(name = "last_invite_sent_at")
    private Instant lastInviteSentAt;

    @Column(name = "invite_send_count", nullable = false)
    private int inviteSendCount;

    @Enumerated(EnumType.STRING)
    @Column(name = "last_invite_method", length = 30)
    private AppEnums.AuthDeliveryMethod lastInviteMethod;

    @Column(name = "last_invite_reference", length = 255)
    private String lastInviteReference;

    @Column(name = "last_invite_redirect_uri", length = 500)
    private String lastInviteRedirectUri;

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private StudentEntity studentProfile;

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private FacultyEntity facultyProfile;

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private AdminEntity adminProfile;

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private ManagerEntity managerProfile;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getAuthUserId() {
        return authUserId;
    }

    public void setAuthUserId(UUID authUserId) {
        this.authUserId = authUserId;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public UserType getUserType() {
        return userType;
    }

    public void setUserType(UserType userType) {
        this.userType = userType;
    }

    public AccountStatus getAccountStatus() {
        return accountStatus;
    }

    public void setAccountStatus(AccountStatus accountStatus) {
        this.accountStatus = accountStatus;
    }

    public boolean isOnboardingCompleted() {
        return onboardingCompleted;
    }

    public void setOnboardingCompleted(boolean onboardingCompleted) {
        this.onboardingCompleted = onboardingCompleted;
    }

    public Instant getLastLoginAt() {
        return lastLoginAt;
    }

    public void setLastLoginAt(Instant lastLoginAt) {
        this.lastLoginAt = lastLoginAt;
    }

    public Instant getInvitedAt() {
        return invitedAt;
    }

    public void setInvitedAt(Instant invitedAt) {
        this.invitedAt = invitedAt;
    }

    public Instant getActivatedAt() {
        return activatedAt;
    }

    public void setActivatedAt(Instant activatedAt) {
        this.activatedAt = activatedAt;
    }

    public Instant getLastInviteSentAt() {
        return lastInviteSentAt;
    }

    public void setLastInviteSentAt(Instant lastInviteSentAt) {
        this.lastInviteSentAt = lastInviteSentAt;
    }

    public int getInviteSendCount() {
        return inviteSendCount;
    }

    public void setInviteSendCount(int inviteSendCount) {
        this.inviteSendCount = inviteSendCount;
    }

    public AppEnums.AuthDeliveryMethod getLastInviteMethod() {
        return lastInviteMethod;
    }

    public void setLastInviteMethod(AppEnums.AuthDeliveryMethod lastInviteMethod) {
        this.lastInviteMethod = lastInviteMethod;
    }

    public String getLastInviteReference() {
        return lastInviteReference;
    }

    public void setLastInviteReference(String lastInviteReference) {
        this.lastInviteReference = lastInviteReference;
    }

    public String getLastInviteRedirectUri() {
        return lastInviteRedirectUri;
    }

    public void setLastInviteRedirectUri(String lastInviteRedirectUri) {
        this.lastInviteRedirectUri = lastInviteRedirectUri;
    }

    public StudentEntity getStudentProfile() {
        return studentProfile;
    }

    public void setStudentProfile(StudentEntity studentProfile) {
        this.studentProfile = studentProfile;
    }

    public FacultyEntity getFacultyProfile() {
        return facultyProfile;
    }

    public void setFacultyProfile(FacultyEntity facultyProfile) {
        this.facultyProfile = facultyProfile;
    }

    public AdminEntity getAdminProfile() {
        return adminProfile;
    }

    public void setAdminProfile(AdminEntity adminProfile) {
        this.adminProfile = adminProfile;
    }

    public ManagerEntity getManagerProfile() {
        return managerProfile;
    }

    public void setManagerProfile(ManagerEntity managerProfile) {
        this.managerProfile = managerProfile;
    }
}
