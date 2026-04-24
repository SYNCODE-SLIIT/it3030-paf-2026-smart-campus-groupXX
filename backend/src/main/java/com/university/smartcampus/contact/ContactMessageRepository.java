package com.university.smartcampus.contact;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.university.smartcampus.contact.entity.ContactMessageEntity;

public interface ContactMessageRepository extends JpaRepository<ContactMessageEntity, UUID> {

    Page<ContactMessageEntity> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
