package com.university.smartcampus;

import java.util.UUID;

public interface AuthIdentityClient {

    ProvisionedIdentity provisionPasswordIdentity(String email, UUID existingAuthUserId, String password);

    void deleteIdentity(UUID authUserId, String email);

    record ProvisionedIdentity(UUID authUserId, boolean created) {
    }
}
