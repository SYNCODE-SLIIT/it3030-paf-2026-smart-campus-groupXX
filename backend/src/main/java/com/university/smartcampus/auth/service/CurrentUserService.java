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
        UUID subject = subjectFromJwt(jwt);

        UserEntity user = userRepository.findByAuthUserId(subject)
            .orElseGet(() -> userRepository.findByEmailIgnoreCase(normalizedEmailFromJwt(jwt))
                        .orElseThrow(
                                () -> new ForbiddenException("This authenticated account has not been provisioned.")));

        if (user.getAuthUserId() != null && !user.getAuthUserId().equals(subject)) {
            throw new ForbiddenException("This identity does not match the provisioned account.");
        }

        if (user.getAccountStatus() == AccountStatus.SUSPENDED) {
            throw new ForbiddenException("This account is suspended.");
        }

        return user;
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
}
