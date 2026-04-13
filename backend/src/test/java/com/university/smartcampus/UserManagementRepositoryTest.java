package com.university.smartcampus;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import com.university.smartcampus.AppEnums.AccountStatus;
import com.university.smartcampus.AppEnums.ManagerRole;
import com.university.smartcampus.AppEnums.UserType;

@SpringBootTest
@Transactional
class UserManagementRepositoryTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private UserRepository userRepository;

    @Test
    void persistsManagerWithMultipleRoleAssignments() {
        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());
        user.setEmail("repo-manager@campus.test");
        user.setUserType(UserType.MANAGER);
        user.setAccountStatus(AccountStatus.ACTIVE);
        user.setInvitedAt(Instant.now());
        user.setActivatedAt(Instant.now());

        ManagerEntity manager = new ManagerEntity();
        manager.setUser(user);
        manager.setFirstName("Ria");
        manager.setLastName("Repo");
        manager.setEmployeeNumber("EMP-REP-1");
        manager.setDepartment("Admin");
        manager.setJobTitle("Operations Manager");
        manager.setManagerRoles(Set.of(ManagerRole.CATALOG_MANAGER, ManagerRole.BOOKING_MANAGER));
        user.setManagerProfile(manager);

        userRepository.saveAndFlush(user);

        UserEntity stored = userRepository.findByEmailIgnoreCase("repo-manager@campus.test").orElseThrow();
        assertThat(stored.getManagerProfile().getManagerRoles())
            .containsExactlyInAnyOrder(ManagerRole.CATALOG_MANAGER, ManagerRole.BOOKING_MANAGER);
    }
}
