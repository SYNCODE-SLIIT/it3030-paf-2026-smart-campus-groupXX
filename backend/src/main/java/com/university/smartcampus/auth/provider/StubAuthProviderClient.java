package com.university.smartcampus.auth.provider;

import java.util.UUID;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import com.university.smartcampus.common.enums.AppEnums.AuthDeliveryMethod;
import com.university.smartcampus.config.SmartCampusProperties;

@Component
@ConditionalOnProperty(prefix = "app.auth.delivery", name = "mode", havingValue = "stub")
public class StubAuthProviderClient implements AuthProviderClient {

    private final SmartCampusProperties properties;

    public StubAuthProviderClient(SmartCampusProperties properties) {
        this.properties = properties;
    }

    @Override
    public DeliveryResult sendInviteLink(String email) {
        return new DeliveryResult(
            AuthDeliveryMethod.INVITE_EMAIL,
            "stub-invite-" + UUID.randomUUID(),
            properties.getAuth().getSupabase().getInviteRedirectTo()
        );
    }

    @Override
    public DeliveryResult sendMagicLink(String email) {
        return new DeliveryResult(
            AuthDeliveryMethod.LOGIN_LINK_EMAIL,
            "stub-magic-" + UUID.randomUUID(),
            properties.getAuth().getSupabase().getMagicLinkRedirectTo()
        );
    }

    @Override
    public DeliveryResult sendRecoveryLink(String email) {
        return new DeliveryResult(
            AuthDeliveryMethod.PASSWORD_RECOVERY_EMAIL,
            "stub-recovery-" + UUID.randomUUID(),
            properties.getAuth().getSupabase().getPasswordRecoveryRedirectTo()
        );
    }
}
