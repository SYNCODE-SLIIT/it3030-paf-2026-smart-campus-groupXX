package com.university.smartcampus;

public final class AppEnums {

    private AppEnums() {
    }

    public enum AccountStatus {
        INVITED,
        ACTIVE,
        SUSPENDED
    }

    public enum AuthDeliveryMethod {
        INVITE_EMAIL,
        LOGIN_LINK_EMAIL
    }

    public enum ManagerRole {
        CATALOG_MANAGER,
        BOOKING_MANAGER,
        TICKET_MANAGER
    }

    public enum UserType {
        STUDENT,
        FACULTY,
        ADMIN,
        MANAGER
    }
}
