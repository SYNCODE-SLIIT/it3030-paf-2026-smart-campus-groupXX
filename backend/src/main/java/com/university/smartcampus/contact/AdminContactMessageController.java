package com.university.smartcampus.contact;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.university.smartcampus.auth.service.CurrentUserService;
import com.university.smartcampus.contact.dto.ContactDtos.ContactMessagePageResponse;

@RestController
@RequestMapping("/api/admin/contact-messages")
public class AdminContactMessageController {

    private final CurrentUserService currentUserService;
    private final ContactMessageService contactMessageService;

    public AdminContactMessageController(
        CurrentUserService currentUserService,
        ContactMessageService contactMessageService
    ) {
        this.currentUserService = currentUserService;
        this.contactMessageService = contactMessageService;
    }

    @GetMapping
    public ContactMessagePageResponse list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {
        currentUserService.requireAdmin(authentication);
        return contactMessageService.listForAdmin(page, size);
    }
}
