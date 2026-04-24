package com.university.smartcampus.contact;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.university.smartcampus.contact.dto.ContactDtos.ContactMessagePageResponse;
import com.university.smartcampus.contact.dto.ContactDtos.ContactMessageResponse;
import com.university.smartcampus.contact.dto.ContactDtos.ContactSubmissionResponse;
import com.university.smartcampus.contact.dto.ContactDtos.SubmitContactMessageRequest;
import com.university.smartcampus.contact.entity.ContactMessageEntity;

@Service
public class ContactMessageService {

    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 100;

    private final ContactMessageRepository contactMessageRepository;

    public ContactMessageService(ContactMessageRepository contactMessageRepository) {
        this.contactMessageRepository = contactMessageRepository;
    }

    @Transactional
    public ContactSubmissionResponse submit(SubmitContactMessageRequest request) {
        ContactMessageEntity entity = new ContactMessageEntity();
        entity.setId(UUID.randomUUID());
        entity.setFullName(trimToNull(request.fullName()));
        entity.setEmail(trimToNull(request.email()));
        entity.setPhone(blankToNull(request.phone()));
        entity.setTitle(trimToNull(request.title()));
        entity.setMessage(trimToNull(request.message()));
        contactMessageRepository.save(entity);
        return new ContactSubmissionResponse(
            entity.getId(),
            "Thank you — we received your message and will get back to you when we can."
        );
    }

    @Transactional(readOnly = true)
    public ContactMessagePageResponse listForAdmin(int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = size <= 0 ? DEFAULT_PAGE_SIZE : Math.min(size, MAX_PAGE_SIZE);
        Page<ContactMessageEntity> result =
            contactMessageRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(safePage, safeSize));
        return new ContactMessagePageResponse(
            result.getContent().stream().map(this::toResponse).toList(),
            result.getNumber(),
            result.getSize(),
            result.getTotalElements(),
            result.getTotalPages(),
            result.hasNext()
        );
    }

    private ContactMessageResponse toResponse(ContactMessageEntity e) {
        return new ContactMessageResponse(
            e.getId(),
            e.getFullName(),
            e.getEmail(),
            e.getPhone() != null ? e.getPhone() : "",
            e.getTitle(),
            e.getMessage(),
            e.getCreatedAt()
        );
    }

    private static String blankToNull(String s) {
        if (s == null) {
            return null;
        }
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private static String trimToNull(String s) {
        if (s == null) {
            return null;
        }
        return s.trim();
    }
}
