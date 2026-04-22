package com.university.smartcampus.auth.service;

import java.util.Locale;
import java.util.UUID;

import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import com.university.smartcampus.common.enums.AppEnums.AccountStatus;
import com.university.smartcampus.common.enums.AppEnums.ManagerRole;
import com.university.smartcampus.common.enums.AppEnums.UserType;
import com.university.smartcampus.common.exception.ForbiddenException;
import com.university.smartcampus.common.exception.OnboardingRequiredException;
import com.university.smartcampus.common.exception.UnauthorizedException;
import com.university.smartcampus.user.entity.UserEntity;
import com.university.smartcampus.user.repository.UserRepository;

@Service
public class CurrentUserService {

    public record ResolvedUserResult(UserEntity user, boolean emailFallbackUsed) {
    }

    private final UserRepository userRepository;

    public CurrentUserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public Jwt requireJwt(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof Jwt jwt)) {
            throw new UnauthorizedException("Authentication is required.");
        }

        return jwt;
    }

    public UserEntity requireCurrentUser(Authentication authentication) {
        Jwt jwt = requireJwt(authentication);
        UserEntity user = resolveProvisionedUser(jwt).user();

        if (user.getAccountStatus() == AccountStatus.SUSPENDED) {
            throw new ForbiddenException("This account is suspended.");
        }

        return user;
    }

    public ResolvedUserResult resolveProvisionedUser(Jwt jwt) {
        UUID subject = subjectFromJwt(jwt);

        UserEntity directMatch = userRepository.findByAuthUserId(subject).orElse(null);
        if (directMatch != null) {
            return new ResolvedUserResult(directMatch, false);
        }

        return resolveProvisionedUserByEmailFallback(jwt, subject);
    }

    public UserEntity requireCurrentUserWithCompletedOnboarding(Authentication authentication) {
        UserEntity user = requireCurrentUser(authentication);
        ensureStudentOnboardingCompleted(user);
        return user;
    }

    public UserEntity requireAdmin(Authentication authentication) {
        UserEntity user = requireCurrentUser(authentication);
        if (user.getUserType() != UserType.ADMIN) {
            throw new ForbiddenException("Admin access is required.");
        }
        return user;
    }

    public UserEntity requireAdminOrBookingManager(Authentication authentication) {
        UserEntity user = requireCurrentUser(authentication);

        if (user.getUserType() == UserType.ADMIN) {
            return user;
        }

        if (
            user.getUserType() == UserType.MANAGER
                && user.getManagerProfile() != null
                && user.getManagerProfile().hasManagerRole(ManagerRole.BOOKING_MANAGER)
        ) {
            return user;
        }

        throw new ForbiddenException("Booking management access is required.");
    }

        public UserEntity requireAdminOrCatalogManager(Authentication authentication) {
        UserEntity user = requireCurrentUser(authentication);
        if (user.getUserType() == UserType.ADMIN) {
            return user;
        }

        if (user.getUserType() == UserType.MANAGER
            && user.getManagerProfile() != null
            && user.getManagerProfile().hasManagerRole(ManagerRole.CATALOG_MANAGER)) {
            return user;
        }

        throw new ForbiddenException("Resource catalogue management access is required.");
    }


    public UserEntity requireStudent(Authentication authentication) {
        UserEntity user = requireCurrentUser(authentication);
        if (user.getUserType() != UserType.STUDENT) {
            throw new ForbiddenException("Student access is required.");
        }
        return user;
    }

    public UserEntity requireTicketManager(Authentication authentication) {
        UserEntity user = requireCurrentUser(authentication);
        if (user.getUserType() != UserType.MANAGER
                || user.getManagerProfile() == null
                || user.getManagerProfile().getManagerRole() != ManagerRole.TICKET_MANAGER) {
            throw new ForbiddenException("Ticket manager access is required.");
        }
        return user;
    }

    private void ensureStudentOnboardingCompleted(UserEntity user) {
        if (user.getUserType() == UserType.STUDENT && !user.isOnboardingCompleted()) {
            throw new OnboardingRequiredException("Complete onboarding to continue.");
        }
    }

    public String normalizedEmailFromJwt(Jwt jwt) {
        String email = firstNonBlank(
                jwt.getClaimAsString("email"),
                jwt.getClaimAsString("preferred_username"),
                jwt.getClaimAsString("upn"));
        if (!StringUtils.hasText(email)) {
            throw new UnauthorizedException("Authenticated token does not contain an email claim.");
        }
        return normalizeEmail(email);
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value;
            }
        }
        return null;
    }

    public UUID subjectFromJwt(Jwt jwt) {
        try {
            return UUID.fromString(jwt.getSubject());
        } catch (IllegalArgumentException exception) {
            throw new UnauthorizedException("Authenticated token subject must be a UUID.");
        }
    }

    public String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }

    private ResolvedUserResult resolveProvisionedUserByEmailFallback(Jwt jwt, UUID subject) {
        UserEntity user = userRepository.findByEmailIgnoreCase(normalizedEmailFromJwt(jwt))
                .orElseThrow(() -> new ForbiddenException("This authenticated account has not been provisioned."));

        if (user.getAuthUserId() != null && !user.getAuthUserId().equals(subject)) {
            throw new ForbiddenException("This identity does not match the provisioned account.");
        }

        if (user.getAuthUserId() != null) {
            return new ResolvedUserResult(user, false);
        }

        if (user.getAccountStatus() != AccountStatus.INVITED) {
            throw new ForbiddenException("This authenticated account must be invited before first sign-in.");
        }

        ensureVerifiedEmailForInviteFallback(jwt);

        return new ResolvedUserResult(user, true);
    }

    private void ensureVerifiedEmailForInviteFallback(Jwt jwt) {
        if (isExplicitlyUnverifiedEmailClaim(jwt)) {
            throw new ForbiddenException("Verified email is required to activate an invited account.");
        }
    }

    private boolean isExplicitlyUnverifiedEmailClaim(Jwt jwt) {
        Object emailVerifiedClaim = jwt.getClaims().get("email_verified");
        if (emailVerifiedClaim != null) {
            Boolean parsedEmailVerified = parseBooleanClaim(emailVerifiedClaim);
            return Boolean.FALSE.equals(parsedEmailVerified);
        }

        if (jwt.getClaims().containsKey("email_confirmed_at")) {
            Object emailConfirmedAtClaim = jwt.getClaims().get("email_confirmed_at");
            return !hasTruthyConfirmedAtClaim(emailConfirmedAtClaim);
        }

        return false;
    }

    private Boolean parseBooleanClaim(Object claimValue) {
        if (claimValue instanceof Boolean booleanValue) {
            return booleanValue;
        }

        if (claimValue instanceof String stringValue && StringUtils.hasText(stringValue)) {
            if ("true".equalsIgnoreCase(stringValue)) {
                return Boolean.TRUE;
            }
            if ("false".equalsIgnoreCase(stringValue)) {
                return Boolean.FALSE;
            }
        }

        return null;
    }

    private boolean hasTruthyConfirmedAtClaim(Object claimValue) {
        if (claimValue == null) {
            return false;
        }

        if (claimValue instanceof Boolean booleanValue) {
            return booleanValue;
        }

        if (claimValue instanceof String stringValue) {
            return StringUtils.hasText(stringValue);
        }

        return true;
    }
}
