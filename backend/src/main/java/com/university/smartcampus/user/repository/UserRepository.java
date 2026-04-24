package com.university.smartcampus.user.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.time.Instant;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.domain.Sort;

import com.university.smartcampus.common.enums.AppEnums.AccountStatus;
import com.university.smartcampus.common.enums.AppEnums.UserType;
import com.university.smartcampus.user.entity.UserEntity;

public interface UserRepository extends JpaRepository<UserEntity, UUID>, JpaSpecificationExecutor<UserEntity> {

    @Override
    @EntityGraph(attributePaths = { "studentProfile", "facultyProfile", "adminProfile", "managerProfile" })
    List<UserEntity> findAll(Specification<UserEntity> spec, Sort sort);

    Optional<UserEntity> findByEmailIgnoreCase(String email);

    Optional<UserEntity> findByAuthUserId(UUID authUserId);

    long countByAccountStatus(AccountStatus accountStatus);

    long countByUserType(UserType userType);

    long countByLastLoginAtAfter(Instant threshold);

    List<UserEntity> findByUserTypeAndAccountStatus(UserType userType, AccountStatus accountStatus);
}
