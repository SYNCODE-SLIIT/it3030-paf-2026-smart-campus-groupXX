package com.university.smartcampus.contact;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.university.smartcampus.contact.dto.ContactDtos.ContactSubmissionResponse;
import com.university.smartcampus.contact.dto.ContactDtos.SubmitContactMessageRequest;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/public/contact")
public class PublicContactController {

    private final ContactMessageService contactMessageService;

    public PublicContactController(ContactMessageService contactMessageService) {
        this.contactMessageService = contactMessageService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ContactSubmissionResponse submit(@Valid @RequestBody SubmitContactMessageRequest request) {
        return contactMessageService.submit(request);
    }
}
