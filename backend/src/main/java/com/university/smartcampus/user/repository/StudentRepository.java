package com.university.smartcampus.user.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.university.smartcampus.user.entity.StudentEntity;

public interface StudentRepository extends JpaRepository<StudentEntity, UUID> {

	@Query(value = """
			select max(cast(right(registration_number, 6) as bigint))
			from students
			where registration_number ~ ('^' || :prefixYear || '[0-9]{6}$')
			""", nativeQuery = true)
	Long findMaxRegistrationSuffix(@Param("prefixYear") String prefixYear);
}
