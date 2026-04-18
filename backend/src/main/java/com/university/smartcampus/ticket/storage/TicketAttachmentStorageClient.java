package com.university.smartcampus.ticket.storage;

import java.util.UUID;

import org.springframework.web.multipart.MultipartFile;

public interface TicketAttachmentStorageClient {

    StoredAttachment upload(UUID ticketId, MultipartFile file);

    void deleteByPublicUrl(String fileUrl);

    record StoredAttachment(String fileName, String fileUrl, String fileType) {
    }
}
