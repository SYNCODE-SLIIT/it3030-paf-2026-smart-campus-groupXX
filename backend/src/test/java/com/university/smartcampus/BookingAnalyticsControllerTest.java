package com.university.smartcampus;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.webAppContextSetup;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.UUID;

import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.context.WebApplicationContext;

import com.university.smartcampus.AppEnums.BookingStatus;
import com.university.smartcampus.AppEnums.CheckInStatus;
import com.university.smartcampus.AppEnums.ModificationStatus;
import com.university.smartcampus.AppEnums.ResourceCategory;
import com.university.smartcampus.AppEnums.ResourceStatus;
import com.university.smartcampus.booking.BookingEntity;
import com.university.smartcampus.booking.BookingModificationEntity;
import com.university.smartcampus.booking.BookingModificationRepository;
import com.university.smartcampus.booking.BookingRepository;
import com.university.smartcampus.common.enums.AppEnums.AccountStatus;
import com.university.smartcampus.common.enums.AppEnums.ManagerRole;
import com.university.smartcampus.common.enums.AppEnums.UserType;
import com.university.smartcampus.resource.ResourceEntity;
import com.university.smartcampus.resource.ResourceRepository;
import com.university.smartcampus.user.entity.AdminEntity;
import com.university.smartcampus.user.entity.FacultyEntity;
import com.university.smartcampus.user.entity.ManagerEntity;
import com.university.smartcampus.user.entity.StudentEntity;
import com.university.smartcampus.user.entity.UserEntity;
import com.university.smartcampus.user.repository.UserRepository;

@SpringBootTest
@Import(TestAuthProviderConfiguration.class)
class BookingAnalyticsControllerTest extends AbstractPostgresIntegrationTest {

    private MockMvc mockMvc;

    @Autowired
    private WebApplicationContext context;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ResourceRepository resourceRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private BookingModificationRepository bookingModificationRepository;

    @BeforeEach
    void setUp() {
        mockMvc = webAppContextSetup(context).apply(springSecurity()).build();
        bookingModificationRepository.deleteAll();
        bookingRepository.deleteAll();
        resourceRepository.deleteAll();
        userRepository.deleteAll();
        seedAdmin("admin@campus.test");
        seedBookingManager("bookingmgr@campus.test");
        seedStudent("student@campus.test");
    }

    @Test
    void adminAndBookingManagerCanAccessAnalyticsButStudentAndFacultyCannot() throws Exception {
        seedFaculty("faculty@campus.test");

        mockMvc.perform(get("/api/admin/bookings/analytics").with(jwtFor("admin@campus.test")))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/admin/bookings/analytics").with(jwtFor("bookingmgr@campus.test")))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/admin/bookings/analytics").with(jwtFor("student@campus.test")))
            .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/admin/bookings/analytics").with(jwtFor("faculty@campus.test")))
            .andExpect(status().isForbidden());
    }

    @Test
    void analyticsUsesDefaultThirtyDayRangeForWindowMetricsWhileKeepingLiveQueueCurrent() throws Exception {
        ResourceEntity resource = seedResource("Library Hall", ResourceCategory.SPACES);

        seedBooking(resource, BookingStatus.PENDING, "2026-04-20T09:00:00+05:30", "2026-04-20T10:00:00+05:30", "2026-04-18T08:00:00Z");
        seedBooking(resource, BookingStatus.PENDING, "2026-02-10T09:00:00+05:30", "2026-02-10T10:00:00+05:30", "2026-02-01T08:00:00Z");

        mockMvc.perform(get("/api/admin/bookings/analytics").with(jwtFor("admin@campus.test")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.bucket").value("DAY"))
            .andExpect(jsonPath("$.liveQueue.pendingApprovals").value(2))
            .andExpect(jsonPath("$.windowSummary.totalScheduled").value(1))
            .andExpect(jsonPath("$.statusBreakdown[0].count").value(1));
    }

    @Test
    void analyticsRejectsInvalidDateRange() throws Exception {
        mockMvc.perform(get("/api/admin/bookings/analytics")
                .param("from", "2026-04-24T12:00:00Z")
                .param("to", "2026-04-23T12:00:00Z")
                .with(jwtFor("admin@campus.test")))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("Analytics start date must be before the end date."));
    }

    @Test
    void analyticsComputesScopedMetricsTrendsAndHeatmap() throws Exception {
        ResourceEntity lectureHall = seedResource("Lecture Hall A", ResourceCategory.SPACES);
        ResourceEntity sportsGround = seedResource("Sports Ground", ResourceCategory.SPORTS);

        BookingEntity pending = seedBooking(
            lectureHall,
            BookingStatus.PENDING,
            "2026-04-20T09:30:00+05:30",
            "2026-04-20T10:30:00+05:30",
            "2026-04-18T08:00:00Z"
        );
        seedBooking(lectureHall, BookingStatus.APPROVED, "2026-04-20T11:00:00+05:30", "2026-04-20T12:00:00+05:30", "2026-04-19T08:00:00Z");
        seedBooking(lectureHall, BookingStatus.CHECKED_IN, "2026-04-20T13:00:00+05:30", "2026-04-20T14:00:00+05:30", "2026-04-19T09:00:00Z");
        seedBooking(lectureHall, BookingStatus.COMPLETED, "2026-04-20T15:00:00+05:30", "2026-04-20T16:00:00+05:30", "2026-04-19T10:00:00Z");
        seedBooking(lectureHall, BookingStatus.REJECTED, "2026-04-20T16:00:00+05:30", "2026-04-20T16:30:00+05:30", "2026-04-19T11:00:00Z");
        seedBooking(lectureHall, BookingStatus.CANCELLED, "2026-04-20T16:30:00+05:30", "2026-04-20T17:00:00+05:30", "2026-04-19T12:00:00Z");
        seedBooking(lectureHall, BookingStatus.NO_SHOW, "2026-04-20T10:15:00+05:30", "2026-04-20T11:15:00+05:30", "2026-04-19T13:00:00Z");

        seedBooking(sportsGround, BookingStatus.PENDING, "2026-04-20T09:00:00+05:30", "2026-04-20T10:00:00+05:30", "2026-04-19T08:00:00Z");

        seedPendingModification(pending);
        seedPendingModification(seedBooking(
            sportsGround,
            BookingStatus.APPROVED,
            "2026-04-20T17:00:00+05:30",
            "2026-04-20T18:00:00+05:30",
            "2026-04-19T14:00:00Z"
        ));

        mockMvc.perform(get("/api/admin/bookings/analytics")
                .param("from", "2026-04-20T00:00:00+05:30")
                .param("to", "2026-04-20T23:59:59+05:30")
                .param("bucket", "DAY")
                .param("resourceId", lectureHall.getId().toString())
                .with(jwtFor("bookingmgr@campus.test")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.liveQueue.pendingApprovals").value(1))
            .andExpect(jsonPath("$.liveQueue.stalePendingApprovals").value(1))
            .andExpect(jsonPath("$.liveQueue.pendingModifications").value(1))
            .andExpect(jsonPath("$.windowSummary.totalScheduled").value(7))
            .andExpect(jsonPath("$.windowSummary.approved").value(1))
            .andExpect(jsonPath("$.windowSummary.attended").value(2))
            .andExpect(jsonPath("$.windowSummary.noShow").value(1))
            .andExpect(jsonPath("$.windowSummary.rejected").value(1))
            .andExpect(jsonPath("$.windowSummary.cancelled").value(1))
            .andExpect(jsonPath("$.windowSummary.approvalRate").value(50.0))
            .andExpect(jsonPath("$.windowSummary.attendanceRate").value(Matchers.closeTo(66.67, 0.01)))
            .andExpect(jsonPath("$.windowSummary.noShowRate").value(Matchers.closeTo(33.33, 0.01)))
            .andExpect(jsonPath("$.categoryBreakdown.length()").value(1))
            .andExpect(jsonPath("$.categoryBreakdown[0].key").value("SPACES"))
            .andExpect(jsonPath("$.topResources[0].resourceId").value(lectureHall.getId().toString()))
            .andExpect(jsonPath("$.topResources[0].bookingCount").value(7))
            .andExpect(jsonPath("$.topResources[0].noShowCount").value(1))
            .andExpect(jsonPath("$.trends.length()").value(1))
            .andExpect(jsonPath("$.trends[0].scheduled").value(7))
            .andExpect(jsonPath("$.trends[0].attended").value(2))
            .andExpect(jsonPath("$.trends[0].noShow").value(1))
            .andExpect(jsonPath("$.utilizationHeatmap[?(@.dayOfWeek == 'MONDAY' && @.hourOfDay == 10)].bookingCount")
                .value(Matchers.hasItem(2)))
            .andExpect(jsonPath("$.utilizationHeatmap[?(@.dayOfWeek == 'MONDAY' && @.hourOfDay == 10)].hoursBooked")
                .value(Matchers.hasItem(Matchers.closeTo(1.25, 0.01))));
    }

    private void seedAdmin(String email) {
        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());
        user.setAuthUserId(authUserIdFor(email));
        user.setEmail(email);
        user.setUserType(UserType.ADMIN);
        user.setAccountStatus(AccountStatus.ACTIVE);
        user.setInvitedAt(Instant.now());
        user.setActivatedAt(Instant.now());

        AdminEntity admin = new AdminEntity();
        admin.setUser(user);
        admin.setFullName("Admin User");
        admin.setEmployeeNumber("ADM-" + UUID.randomUUID().toString().substring(0, 8));
        user.setAdminProfile(admin);

        userRepository.save(user);
    }

    private UserEntity seedFaculty(String email) {
        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());
        user.setAuthUserId(authUserIdFor(email));
        user.setEmail(email);
        user.setUserType(UserType.FACULTY);
        user.setAccountStatus(AccountStatus.ACTIVE);
        user.setInvitedAt(Instant.now());
        user.setActivatedAt(Instant.now());

        FacultyEntity faculty = new FacultyEntity();
        faculty.setUser(user);
        faculty.setFirstName("Faculty");
        faculty.setLastName("User");
        faculty.setEmployeeNumber("FAC-" + UUID.randomUUID().toString().substring(0, 8));
        user.setFacultyProfile(faculty);

        return userRepository.save(user);
    }

    private UserEntity seedStudent(String email) {
        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());
        user.setAuthUserId(authUserIdFor(email));
        user.setEmail(email);
        user.setUserType(UserType.STUDENT);
        user.setAccountStatus(AccountStatus.ACTIVE);
        user.setInvitedAt(Instant.now());
        user.setActivatedAt(Instant.now());

        StudentEntity student = new StudentEntity();
        student.setUser(user);
        student.setOnboardingCompleted(true);
        student.setRegistrationNumber("IT" + UUID.randomUUID().toString().substring(0, 6));
        user.setStudentProfile(student);

        return userRepository.save(user);
    }

    private UserEntity seedBookingManager(String email) {
        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());
        user.setAuthUserId(authUserIdFor(email));
        user.setEmail(email);
        user.setUserType(UserType.MANAGER);
        user.setAccountStatus(AccountStatus.ACTIVE);
        user.setInvitedAt(Instant.now());
        user.setActivatedAt(Instant.now());

        ManagerEntity manager = new ManagerEntity();
        manager.setUser(user);
        manager.setFirstName("Booking");
        manager.setLastName("Manager");
        manager.setEmployeeNumber("MGR-" + UUID.randomUUID().toString().substring(0, 8));
        manager.setManagerRole(ManagerRole.BOOKING_MANAGER);
        user.setManagerProfile(manager);

        return userRepository.save(user);
    }

    private ResourceEntity seedResource(String name, ResourceCategory category) {
        ResourceEntity resource = new ResourceEntity();
        resource.setId(UUID.randomUUID());
        resource.setCode("RS-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        resource.setName(name);
        resource.setCategory(category);
        resource.setDescription(name + " description");
        resource.setStatus(ResourceStatus.ACTIVE);
        resource.setBookable(true);
        resource.setMovable(false);
        return resourceRepository.save(resource);
    }

    private BookingEntity seedBooking(
        ResourceEntity resource,
        BookingStatus status,
        String startTime,
        String endTime,
        String createdAt
    ) {
        UserEntity requester = userRepository.findByEmailIgnoreCase("student@campus.test").orElseThrow();
        BookingEntity booking = new BookingEntity();
        booking.setId(UUID.randomUUID());
        booking.setResource(resource);
        booking.setRequester(requester);
        booking.setStatus(status);
        booking.setStartTime(OffsetDateTime.parse(startTime).toInstant());
        booking.setEndTime(OffsetDateTime.parse(endTime).toInstant());
        booking.setCreatedAt(Instant.parse(createdAt));

        if (status == BookingStatus.CHECKED_IN || status == BookingStatus.COMPLETED) {
            booking.setCheckInStatus(CheckInStatus.CHECKED_IN);
            booking.setCheckedInAt(booking.getStartTime().plusSeconds(600));
        }
        if (status == BookingStatus.NO_SHOW) {
            booking.setCheckInStatus(CheckInStatus.NO_SHOW);
        }
        if (status == BookingStatus.REJECTED || status == BookingStatus.APPROVED) {
            booking.setDecidedAt(booking.getStartTime().minusSeconds(1800));
        }
        if (status == BookingStatus.CANCELLED) {
            booking.setCancelledAt(booking.getStartTime().minusSeconds(1800));
        }

        return bookingRepository.save(booking);
    }

    private BookingModificationEntity seedPendingModification(BookingEntity booking) {
        BookingModificationEntity modification = new BookingModificationEntity();
        modification.setId(UUID.randomUUID());
        modification.setBooking(booking);
        modification.setRequestedBy(booking.getRequester());
        modification.setRequestedStartTime(booking.getStartTime().plusSeconds(1800));
        modification.setRequestedEndTime(booking.getEndTime().plusSeconds(1800));
        modification.setReason("Move booking");
        modification.setStatus(ModificationStatus.PENDING);
        return bookingModificationRepository.save(modification);
    }
}
