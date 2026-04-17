package com.university.smartcampus;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.web.multipart.MultipartFile;

import com.university.smartcampus.auth.identity.AuthIdentityClient;
import com.university.smartcampus.auth.provider.AuthProviderClient;
import com.university.smartcampus.common.enums.AppEnums.AuthDeliveryMethod;
import com.university.smartcampus.user.storage.ProfileImageStorageClient;

@TestConfiguration
public class TestAuthProviderConfiguration {

    @Bean
    @Primary
    RecordingAuthProviderClient recordingAuthProviderClient() {
        return new RecordingAuthProviderClient();
    }

    @Bean
    @Primary
    RecordingAuthIdentityClient recordingAuthIdentityClient() {
        return new RecordingAuthIdentityClient();
    }

    @Bean
    @Primary
    RecordingProfileImageStorageClient recordingProfileImageStorageClient() {
        return new RecordingProfileImageStorageClient();
    }

    static class RecordingAuthProviderClient implements AuthProviderClient {

        private final List<DeliveryResult> deliveries = new ArrayList<>();

        @Override
        public DeliveryResult sendInviteLink(String email) {
            DeliveryResult result = new DeliveryResult(
                AuthDeliveryMethod.INVITE_EMAIL,
                "invite-" + UUID.randomUUID(),
                "http://localhost/invite"
            );
            deliveries.add(result);
            return result;
        }

        @Override
        public DeliveryResult sendMagicLink(String email) {
            DeliveryResult result = new DeliveryResult(
                AuthDeliveryMethod.LOGIN_LINK_EMAIL,
                "magic-" + UUID.randomUUID(),
                "http://localhost/magic"
            );
            deliveries.add(result);
            return result;
        }

        List<DeliveryResult> deliveries() {
            return Collections.unmodifiableList(deliveries);
        }

        void reset() {
            deliveries.clear();
        }
    }

    static class RecordingAuthIdentityClient implements AuthIdentityClient {

        private final List<ProvisionedIdentity> identities = new ArrayList<>();
        private final List<UUID> deletedIdentityIds = new ArrayList<>();

        @Override
        public ProvisionedIdentity provisionPasswordIdentity(String email, UUID existingAuthUserId, String password) {
            UUID authUserId = existingAuthUserId != null ? existingAuthUserId : UUID.randomUUID();
            ProvisionedIdentity result = new ProvisionedIdentity(authUserId, existingAuthUserId == null);
            identities.add(result);
            return result;
        }

        @Override
        public void deleteIdentity(UUID authUserId, String email) {
            if (authUserId != null) {
                deletedIdentityIds.add(authUserId);
            }
        }

        List<ProvisionedIdentity> identities() {
            return Collections.unmodifiableList(identities);
        }

        List<UUID> deletedIdentityIds() {
            return Collections.unmodifiableList(deletedIdentityIds);
        }

        void reset() {
            identities.clear();
            deletedIdentityIds.clear();
        }
    }

    static class RecordingProfileImageStorageClient implements ProfileImageStorageClient {

        private final List<StoredProfileImage> storedImages = new ArrayList<>();

        @Override
        public StoredProfileImage storeStudentProfileImage(UUID userId, MultipartFile file) {
            StoredProfileImage image = new StoredProfileImage(
                "https://storage.test/profile-images/students/" + userId + "/profile.jpg",
                "students/" + userId + "/profile.jpg"
            );
            storedImages.add(image);
            return image;
        }

        List<StoredProfileImage> storedImages() {
            return Collections.unmodifiableList(storedImages);
        }

        void reset() {
            storedImages.clear();
        }
    }
}
