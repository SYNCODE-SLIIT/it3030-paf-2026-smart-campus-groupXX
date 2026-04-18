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

     public enum ResourceCategory {
        SPACES,
        TECHNICAL_EQUIPMENT,
        MAINTENANCE_AND_CLEANING,
        SPORTS,
        EVENT_AND_DECORATION,
        GENERAL_UTILITY,
        TRANSPORT_AND_LOGISTICS
    }

    public enum ResourceStatus {
        ACTIVE,
        OUT_OF_SERVICE,
        MAINTENANCE,
        INACTIVE
    }
    
    public enum UserType {
        STUDENT,
        FACULTY,
        ADMIN,
        MANAGER
    }

    public enum BookingStatus {
        PENDING,
        APPROVED,
        REJECTED,
        CANCELLED
    }

   
}
