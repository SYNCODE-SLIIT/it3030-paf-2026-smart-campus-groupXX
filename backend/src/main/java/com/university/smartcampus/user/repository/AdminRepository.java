package com.university.smartcampus.user.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.university.smartcampus.user.entity.AdminEntity;

public interface AdminRepository extends JpaRepository<AdminEntity, UUID> {

	@Query(value = """
			select max(cast(right(employee_number, 6) as bigint))
			from admins
			where employee_number ~ ('^' || :prefixYear || '[0-9]{6}$')
			""", nativeQuery = true)
	Long findMaxEmployeeSuffix(@Param("prefixYear") String prefixYear);
}
