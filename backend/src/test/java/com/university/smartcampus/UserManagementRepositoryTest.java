package com.university.smartcampus;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import com.university.smartcampus.common.enums.AppEnums.AccountStatus;
import com.university.smartcampus.common.enums.AppEnums.ManagerRole;
import com.university.smartcampus.common.enums.AppEnums.UserType;
import com.university.smartcampus.user.entity.ManagerEntity;
import com.university.smartcampus.user.entity.UserEntity;
import com.university.smartcampus.user.repository.UserRepository;

@SpringBootTest
@Transactional
class UserManagementRepositoryTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private UserRepository userRepository;

    @Test
    void persistsManagerWithSingleRoleAssignment() {
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
        manager.setManagerRole(ManagerRole.CATALOG_MANAGER);
        user.setManagerProfile(manager);

        userRepository.saveAndFlush(user);

        UserEntity stored = userRepository.findByEmailIgnoreCase("repo-manager@campus.test").orElseThrow();
        assertThat(stored.getManagerProfile().getManagerRole()).isEqualTo(ManagerRole.CATALOG_MANAGER);
    }
}
