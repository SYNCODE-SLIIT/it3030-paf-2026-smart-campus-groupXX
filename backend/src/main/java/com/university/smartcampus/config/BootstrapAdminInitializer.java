package com.university.smartcampus.config;

import java.time.Instant;
import java.util.UUID;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.university.smartcampus.auth.identity.AuthIdentityClient;
import com.university.smartcampus.auth.service.CurrentUserService;
import com.university.smartcampus.common.enums.AppEnums.AccountStatus;
import com.university.smartcampus.common.enums.AppEnums.UserType;
import com.university.smartcampus.user.entity.AdminEntity;
import com.university.smartcampus.user.entity.UserEntity;
import com.university.smartcampus.user.identifier.UserIdentifierService;
import com.university.smartcampus.user.repository.UserRepository;

@Component
public class BootstrapAdminInitializer implements ApplicationRunner {

    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;
    private final SmartCampusProperties properties;
    private final AuthIdentityClient authIdentityClient;
    private final UserIdentifierService userIdentifierService;

    public BootstrapAdminInitializer(
        UserRepository userRepository,
        CurrentUserService currentUserService,
        SmartCampusProperties properties,
        AuthIdentityClient authIdentityClient,
        UserIdentifierService userIdentifierService
    ) {
        this.userRepository = userRepository;
        this.currentUserService = currentUserService;
        this.properties = properties;
        this.authIdentityClient = authIdentityClient;
        this.userIdentifierService = userIdentifierService;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        SmartCampusProperties.Admin bootstrapAdmin = properties.getBootstrap().getAdmin();
        if (!StringUtils.hasText(bootstrapAdmin.getEmail())) {
            return;
        }

        String email = currentUserService.normalizeEmail(bootstrapAdmin.getEmail());
        UserEntity user = userRepository.findByEmailIgnoreCase(email).orElse(null);

        if (user == null) {
            user = new UserEntity();
            user.setId(UUID.randomUUID());
            user.setEmail(email);
            user.setUserType(UserType.ADMIN);
            user.setAccountStatus(AccountStatus.ACTIVE);
            user.setInvitedAt(Instant.now());
            user.setActivatedAt(Instant.now());

            AdminEntity admin = new AdminEntity();
            admin.setUser(user);
            admin.setFullName(bootstrapAdmin.fullNameOrDefault(email));
            user.setAdminProfile(admin);
            userRepository.save(user);
        }

        if (user.getUserType() == UserType.ADMIN && user.getAdminProfile() != null
                && !StringUtils.hasText(user.getAdminProfile().getEmployeeNumber())) {
            user.getAdminProfile().setEmployeeNumber(
                userIdentifierService.generateAdminEmployeeNumber(user.getInvitedAt()));
            userRepository.save(user);
        }

        if (user.getUserType() == UserType.ADMIN && StringUtils.hasText(bootstrapAdmin.getPassword())) {
            AuthIdentityClient.ProvisionedIdentity identity = authIdentityClient.provisionPasswordIdentity(
                user.getEmail(),
                user.getAuthUserId(),
                bootstrapAdmin.getPassword()
            );
            if (!identity.authUserId().equals(user.getAuthUserId())) {
                user.setAuthUserId(identity.authUserId());
                userRepository.save(user);
            }
        }
    }
}
