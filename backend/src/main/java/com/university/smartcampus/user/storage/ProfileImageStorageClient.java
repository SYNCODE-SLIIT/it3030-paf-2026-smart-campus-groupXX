package com.university.smartcampus.user.storage;

import java.util.UUID;

import org.springframework.web.multipart.MultipartFile;

public interface ProfileImageStorageClient {

    StoredProfileImage storeStudentProfileImage(UUID userId, MultipartFile file);

    record StoredProfileImage(String publicUrl, String objectPath) {
    }
}
