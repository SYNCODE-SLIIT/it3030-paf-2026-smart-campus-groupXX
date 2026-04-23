package com.university.smartcampus.resource;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.university.smartcampus.AppEnums.ResourceCategory;
import com.university.smartcampus.AppEnums.ResourceStatus;
import com.university.smartcampus.resource.ResourceDtos.ResourceListItem;
import com.university.smartcampus.resource.ResourceDtos.ResourceOption;

import java.util.List;
import java.util.Optional;

public interface ResourceRepository extends JpaRepository<ResourceEntity, UUID>, JpaSpecificationExecutor<ResourceEntity> {

    boolean existsByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCaseAndIdNot(String code, UUID id);

    boolean existsByLocationEntity_Id(UUID locationId);

    boolean existsByResourceType_Id(UUID resourceTypeId);

    long countByStatus(ResourceStatus status);

    long countByBookableTrue();

    @Query("""
        select new com.university.smartcampus.resource.ResourceDtos$ResourceListItem(
            r.id,
            r.code,
            r.name,
            r.category,
            r.subcategory,
            r.description,
            r.location,
            r.capacity,
            r.quantity,
            r.status,
            r.bookable,
            r.movable,
            r.availableFrom,
            r.availableTo,
            rt.name,
            coalesce(l.locationName, r.location),
            coalesce(b.buildingName, l.buildingName),
            r.managedByRole
        )
        from ResourceEntity r
        left join r.resourceType rt
        left join r.locationEntity l
        left join l.building b
        where (:search is null
            or lower(r.code) like :search
            or lower(r.name) like :search
            or lower(r.description) like :search
            or lower(r.subcategory) like :search
            or lower(r.location) like :search
            or lower(rt.name) like :search
            or lower(l.locationName) like :search
            or lower(b.buildingName) like :search)
        and (:category is null or r.category = :category)
        and (:status is null or r.status = :status)
        and (:location is null
            or lower(r.location) like :location
            or lower(l.locationName) like :location
            or lower(b.buildingName) like :location)
        order by r.code asc
        """)
    Page<ResourceListItem> findResourceListItems(
        @Param("search") String search,
        @Param("category") ResourceCategory category,
        @Param("status") ResourceStatus status,
        @Param("location") String location,
        Pageable pageable
    );

    @Query("""
        select new com.university.smartcampus.resource.ResourceDtos$ResourceOption(
            r.id,
            r.code,
            r.name,
            r.category,
            r.subcategory,
            coalesce(l.locationName, r.location),
            r.status,
            r.bookable
        )
        from ResourceEntity r
        left join r.locationEntity l
        where (:status is null or r.status = :status)
        and (:bookable is null or r.bookable = :bookable)
        order by r.code asc
        """)
    List<ResourceOption> findResourceOptions(
        @Param("status") ResourceStatus status,
        @Param("bookable") Boolean bookable
    );

    @Query("""
        select count(distinct coalesce(l.locationName, r.location))
        from ResourceEntity r
        left join r.locationEntity l
        where coalesce(l.locationName, r.location) is not null
        """)
    long countDistinctResourceLocations();

    @EntityGraph(attributePaths = {"resourceType", "locationEntity", "locationEntity.building"})
    @Query("select r from ResourceEntity r where r.id = :id")
    Optional<ResourceEntity> findByIdWithTypeAndLocation(@Param("id") UUID id);
}
