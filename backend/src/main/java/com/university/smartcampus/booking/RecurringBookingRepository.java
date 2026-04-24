package com.university.smartcampus.booking;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface RecurringBookingRepository extends JpaRepository<RecurringBookingEntity, UUID> {
    List<RecurringBookingEntity> findByRequesterId(UUID requesterId);
    List<RecurringBookingEntity> findByResourceIdAndActive(UUID resourceId, boolean active);
    Optional<RecurringBookingEntity> findByIdAndRequesterId(UUID id, UUID requesterId);

    @Modifying
    @Query("delete from RecurringBookingEntity r where r.resource.id = :resourceId")
    int deleteByResourceId(@Param("resourceId") UUID resourceId);
}
