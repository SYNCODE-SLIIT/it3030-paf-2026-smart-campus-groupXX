package com.university.smartcampus.auth.provider;

import com.university.smartcampus.common.enums.AppEnums.AuthDeliveryMethod;

public interface AuthProviderClient {

    DeliveryResult sendInviteLink(String email);

    DeliveryResult sendMagicLink(String email);

    DeliveryResult sendRecoveryLink(String email);

    record DeliveryResult(AuthDeliveryMethod deliveryMethod, String authReference, String redirectUri) {
    }
}
