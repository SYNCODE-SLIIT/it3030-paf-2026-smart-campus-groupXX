package com.university.smartcampus.user.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.university.smartcampus.user.entity.ManagerEntity;

public interface ManagerRepository extends JpaRepository<ManagerEntity, UUID> {

    Optional<ManagerEntity> findByUserId(UUID userId);

    @Query(value = """
            select max(cast(right(employee_number, 6) as bigint))
            from managers
            where employee_number ~ ('^' || :prefixYear || '[0-9]{6}$')
            """, nativeQuery = true)
    Long findMaxEmployeeSuffix(@Param("prefixYear") String prefixYear);
}
