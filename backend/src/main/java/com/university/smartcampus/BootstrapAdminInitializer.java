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

    public BootstrapAdminInitializer(
        UserRepository userRepository,
        CurrentUserService currentUserService,
        SmartCampusProperties properties
    ) {
        this.userRepository = userRepository;
        this.currentUserService = currentUserService;
        this.properties = properties;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        SmartCampusProperties.Admin bootstrapAdmin = properties.getBootstrap().getAdmin();
        if (!StringUtils.hasText(bootstrapAdmin.getEmail())) {
            return;
        }

        String email = currentUserService.normalizeEmail(bootstrapAdmin.getEmail());
        if (userRepository.findByEmailIgnoreCase(email).isPresent()) {
            return;
        }

        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());
        user.setEmail(email);
        user.setUserType(UserType.ADMIN);
        user.setAccountStatus(AccountStatus.ACTIVE);
        user.setOnboardingCompleted(true);
        user.setInvitedAt(Instant.now());
        user.setActivatedAt(Instant.now());

        AdminEntity admin = new AdminEntity();
        admin.setUser(user);
        admin.setFirstName(bootstrapAdmin.getFirstName());
        admin.setLastName(bootstrapAdmin.getLastName());
        admin.setEmployeeNumber(bootstrapAdmin.getEmployeeNumber());
        admin.setDepartment(bootstrapAdmin.getDepartment());
        admin.setJobTitle(bootstrapAdmin.getJobTitle());
        user.setAdminProfile(admin);

        userRepository.save(user);
    }
}
