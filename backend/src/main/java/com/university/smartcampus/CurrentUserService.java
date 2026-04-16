package com.university.smartcampus;

import java.util.Locale;
import java.util.UUID;

import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import com.university.smartcampus.AppEnums.AccountStatus;
import com.university.smartcampus.AppEnums.UserType;

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
        String email = normalizedEmailFromJwt(jwt);
        UUID subject = subjectFromJwt(jwt);

        UserEntity user = userRepository.findByAuthUserId(subject)
                .orElseGet(() -> userRepository.findByEmailIgnoreCase(email)
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

    public UserEntity requireAdmin(Authentication authentication) {
        UserEntity user = requireCurrentUser(authentication);
        if (user.getUserType() != UserType.ADMIN) {
            throw new ForbiddenException("Admin access is required.");
        }
        return user;
    }

    public UserEntity requireStudent(Authentication authentication) {
        UserEntity user = requireCurrentUser(authentication);
        if (user.getUserType() != UserType.STUDENT) {
            throw new ForbiddenException("Student access is required.");
        }
        return user;
    }

    public String normalizedEmailFromJwt(Jwt jwt) {
        String email = jwt.getClaimAsString("email");
        if (!StringUtils.hasText(email)) {
            throw new UnauthorizedException("Authenticated token does not contain an email claim.");
        }
        return normalizeEmail(email);
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
