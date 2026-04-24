package com.university.smartcampus.user.service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.university.smartcampus.AppEnums.BookingStatus;
import com.university.smartcampus.common.enums.AppEnums.AccountStatus;
import com.university.smartcampus.common.enums.AppEnums.TicketStatus;
import com.university.smartcampus.common.enums.AppEnums.UserType;
import com.university.smartcampus.notification.NotificationService;
import com.university.smartcampus.resource.BuildingRepository;
import com.university.smartcampus.resource.ResourceRepository;
import com.university.smartcampus.AppEnums.ResourceStatus;
import com.university.smartcampus.ticket.repository.TicketRepository;
import com.university.smartcampus.booking.BookingRepository;
import com.university.smartcampus.user.dto.AdminDtos.AdminDashboardResponse;
import com.university.smartcampus.user.dto.AdminDtos.DashboardQuickLink;
import com.university.smartcampus.user.entity.UserEntity;
import com.university.smartcampus.user.repository.UserRepository;

@Service
public class AdminDashboardService {

    private final UserRepository userRepository;
    private final TicketRepository ticketRepository;
    private final BookingRepository bookingRepository;
    private final ResourceRepository resourceRepository;
    private final BuildingRepository buildingRepository;
    private final NotificationService notificationService;

    public AdminDashboardService(
        UserRepository userRepository,
        TicketRepository ticketRepository,
        BookingRepository bookingRepository,
        ResourceRepository resourceRepository,
        BuildingRepository buildingRepository,
        NotificationService notificationService
    ) {
        this.userRepository = userRepository;
        this.ticketRepository = ticketRepository;
        this.bookingRepository = bookingRepository;
        this.resourceRepository = resourceRepository;
        this.buildingRepository = buildingRepository;
        this.notificationService = notificationService;
    }

    @Transactional(readOnly = true)
    public AdminDashboardResponse getDashboard(UserEntity admin) {
        Instant oneWeekAgo = Instant.now().minus(7, ChronoUnit.DAYS);

        return new AdminDashboardResponse(
            userRepository.count(),
            userRepository.countByAccountStatus(AccountStatus.ACTIVE),
            userRepository.countByAccountStatus(AccountStatus.INVITED),
            userRepository.countByAccountStatus(AccountStatus.SUSPENDED),
            userRepository.countByLastLoginAtAfter(oneWeekAgo),
            userRepository.countByUserType(UserType.STUDENT),
            userRepository.countByUserType(UserType.FACULTY),
            userRepository.countByUserType(UserType.MANAGER),
            userRepository.countByUserType(UserType.ADMIN),
            ticketRepository.countByStatus(TicketStatus.OPEN),
            ticketRepository.countByStatus(TicketStatus.IN_PROGRESS),
            bookingRepository.countByStatus(BookingStatus.PENDING),
            bookingRepository.countByStatus(BookingStatus.APPROVED) + bookingRepository.countByStatus(BookingStatus.CHECKED_IN),
            resourceRepository.count(),
            resourceRepository.countByStatus(ResourceStatus.ACTIVE),
            resourceRepository.countByStatus(ResourceStatus.MAINTENANCE),
            resourceRepository.countByStatus(ResourceStatus.OUT_OF_SERVICE),
            buildingRepository.count(),
            buildingRepository.countByActiveTrue(),
            notificationService.unreadCount(admin).unreadCount(),
            List.of(
                new DashboardQuickLink("User Management", "/admin/users", "Invite, review, and manage campus accounts."),
                new DashboardQuickLink("Tickets", "/admin/tickets", "Monitor support issues and assign ownership."),
                new DashboardQuickLink("Bookings", "/admin/bookings", "Review pending requests and booking flow."),
                new DashboardQuickLink("Notifications", "/admin/notifications", "Check unread items and delivery health.")
            )
        );
    }
}
