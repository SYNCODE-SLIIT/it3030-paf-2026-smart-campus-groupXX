package com.university.smartcampus;

import java.time.Instant;
import java.util.UUID;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.university.smartcampus.AppEnums.AccountStatus;
import com.university.smartcampus.AppEnums.UserType;

@Component
public class BootstrapAdminInitializer implements ApplicationRunner {

    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;
    private final SmartCampusProperties properties;
    private final AuthIdentityClient authIdentityClient;

    public BootstrapAdminInitializer(
        UserRepository userRepository,
        CurrentUserService currentUserService,
        SmartCampusProperties properties,
        AuthIdentityClient authIdentityClient
    ) {
        this.userRepository = userRepository;
        this.currentUserService = currentUserService;
        this.properties = properties;
        this.authIdentityClient = authIdentityClient;
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
            admin.setEmployeeNumber(bootstrapAdmin.getEmployeeNumber());
            user.setAdminProfile(admin);
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
