package com.university.smartcampus.user.identifier;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

public interface IdentifierCounterRepository extends JpaRepository<IdentifierCounterEntity, String> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select counter from IdentifierCounterEntity counter where counter.counterKey = :counterKey")
    Optional<IdentifierCounterEntity> findForUpdate(@Param("counterKey") String counterKey);
}
