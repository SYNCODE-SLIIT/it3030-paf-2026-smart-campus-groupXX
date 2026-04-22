package com.university.smartcampus.user.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.university.smartcampus.common.enums.AppEnums.AccountStatus;
import com.university.smartcampus.common.enums.AppEnums.UserType;
import com.university.smartcampus.user.entity.UserEntity;

public interface UserRepository extends JpaRepository<UserEntity, UUID>, JpaSpecificationExecutor<UserEntity> {

    Optional<UserEntity> findByEmailIgnoreCase(String email);

    Optional<UserEntity> findByAuthUserId(UUID authUserId);

    List<UserEntity> findByUserTypeAndAccountStatus(UserType userType, AccountStatus accountStatus);
}
