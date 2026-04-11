package com.university.smartcampus;

import com.university.smartcampus.AppEnums.AuthDeliveryMethod;

public interface AuthProviderClient {

    DeliveryResult sendInviteLink(String email);

    DeliveryResult sendMagicLink(String email);

    record DeliveryResult(AuthDeliveryMethod deliveryMethod, String authReference, String redirectUri) {
    }
}
