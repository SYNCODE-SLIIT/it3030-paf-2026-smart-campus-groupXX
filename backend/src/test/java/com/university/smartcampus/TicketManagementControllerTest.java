package com.university.smartcampus;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.webAppContextSetup;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.context.WebApplicationContext;

import com.university.smartcampus.common.enums.AppEnums.AccountStatus;
import com.university.smartcampus.common.enums.AppEnums.ManagerRole;
import com.university.smartcampus.common.enums.AppEnums.TicketCategory;
import com.university.smartcampus.common.enums.AppEnums.TicketPriority;
import com.university.smartcampus.common.enums.AppEnums.TicketStatus;
import com.university.smartcampus.common.enums.AppEnums.UserType;
import com.university.smartcampus.resource.Location;
import com.university.smartcampus.resource.LocationRepository;
import com.university.smartcampus.resource.ResourceEntity;
import com.university.smartcampus.resource.ResourceRepository;
import com.university.smartcampus.ticket.dto.TicketDtos.AddCommentRequest;
import com.university.smartcampus.ticket.dto.TicketDtos.AddTicketAttachmentRequest;
import com.university.smartcampus.ticket.dto.TicketDtos.AssignTicketRequest;
import com.university.smartcampus.ticket.dto.TicketDtos.CreateTicketRequest;
import com.university.smartcampus.ticket.dto.TicketDtos.TicketStatusUpdateRequest;
import com.university.smartcampus.ticket.dto.TicketDtos.UpdateCommentRequest;
import com.university.smartcampus.ticket.entity.TicketAttachmentEntity;
import com.university.smartcampus.ticket.entity.TicketAssignmentHistoryEntity;
import com.university.smartcampus.ticket.entity.TicketCommentEntity;
import com.university.smartcampus.ticket.entity.TicketEntity;
import com.university.smartcampus.ticket.entity.TicketStatusHistoryEntity;
import com.university.smartcampus.ticket.repository.TicketAttachmentRepository;
import com.university.smartcampus.ticket.repository.TicketAssignmentHistoryRepository;
import com.university.smartcampus.ticket.repository.TicketCommentRepository;
import com.university.smartcampus.ticket.repository.TicketRepository;
import com.university.smartcampus.ticket.repository.TicketStatusHistoryRepository;
import com.university.smartcampus.user.entity.AdminEntity;
import com.university.smartcampus.user.entity.FacultyEntity;
import com.university.smartcampus.user.entity.ManagerEntity;
import com.university.smartcampus.user.entity.StudentEntity;
import com.university.smartcampus.user.entity.UserEntity;
import com.university.smartcampus.user.repository.UserRepository;

import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@Import(TestAuthProviderConfiguration.class)
class TicketManagementControllerTest extends AbstractPostgresIntegrationTest {

    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ResourceRepository resourceRepository;

    @Autowired
    private LocationRepository locationRepository;

    @Autowired
    private TicketRepository ticketRepository;

    @Autowired
    private TicketAttachmentRepository ticketAttachmentRepository;

    @Autowired
    private TicketAssignmentHistoryRepository ticketAssignmentHistoryRepository;

    @Autowired
    private TicketCommentRepository ticketCommentRepository;

    @Autowired
    private TicketStatusHistoryRepository ticketStatusHistoryRepository;

    @Autowired
    private TestAuthProviderConfiguration.RecordingTicketAttachmentStorageClient ticketAttachmentStorageClient;

    @Autowired
    private WebApplicationContext context;

    @BeforeEach
    void setUp() {
        mockMvc = webAppContextSetup(context).apply(springSecurity()).build();
        ticketAttachmentRepository.deleteAll();
        ticketAssignmentHistoryRepository.deleteAll();
        ticketCommentRepository.deleteAll();
        ticketAttachmentStorageClient.reset();
        ticketStatusHistoryRepository.deleteAll();
        ticketRepository.deleteAll();
        userRepository.deleteAll();
        seedAdmin("admin@campus.test");
        seedStudent("student@campus.test");
        seedTicketManager("ticketmgr@campus.test");
    }

    @Test
    void reporterCanCreateTicketAndGetSequentialCode() throws Exception {
        CreateTicketRequest request = new CreateTicketRequest(
                "Broken light in Lab 3", "The fluorescent light is flickering constantly.",
                TicketCategory.ELECTRICAL, TicketPriority.MEDIUM, null);

        mockMvc.perform(post("/api/tickets")
                        .with(jwtFor("student@campus.test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.ticketCode").value(org.hamcrest.Matchers.matchesPattern("TCK-\\d{4}")))
                .andExpect(jsonPath("$.status").value("OPEN"))
                .andExpect(jsonPath("$.title").value("Broken light in Lab 3"))
                .andExpect(jsonPath("$.reportedByEmail").value("student@campus.test"))
                .andExpect(jsonPath("$.resourceId").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.locationId").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$._links.self.href").exists());

        TicketEntity persisted = ticketRepository.findAll().get(0);
        assertThat(persisted.getResourceId()).isNull();
        assertThat(persisted.getLocationId()).isNull();
    }

    @Test
    void reporterCanCreateTicketForResourceAndBackendDerivesLocation() throws Exception {
        Location location = seedLocation("Issue Location");
        ResourceEntity resource = seedResource("Projector", location);
        CreateTicketRequest request = new CreateTicketRequest(
                "Projector issue", "The display keeps cutting out.",
                TicketCategory.EQUIPMENT, TicketPriority.HIGH, null, resource.getId());

        mockMvc.perform(post("/api/tickets")
                        .with(jwtFor("student@campus.test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.resourceId").value(resource.getId().toString()))
                .andExpect(jsonPath("$.locationId").value(location.getId().toString()));

        TicketEntity persisted = ticketRepository.findAll().get(0);
        assertThat(persisted.getResourceId()).isEqualTo(resource.getId());
        assertThat(persisted.getLocationId()).isEqualTo(location.getId());
    }

    @Test
    void reporterCanCreateTicketForResourceWithoutLocation() throws Exception {
        ResourceEntity resource = seedResource("Portable Speaker", null);
        CreateTicketRequest request = new CreateTicketRequest(
                "Speaker issue", "The speaker battery no longer charges.",
                TicketCategory.EQUIPMENT, TicketPriority.MEDIUM, null, resource.getId());

        mockMvc.perform(post("/api/tickets")
                        .with(jwtFor("student@campus.test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.resourceId").value(resource.getId().toString()))
                .andExpect(jsonPath("$.locationId").value(org.hamcrest.Matchers.nullValue()));

        TicketEntity persisted = ticketRepository.findAll().get(0);
        assertThat(persisted.getResourceId()).isEqualTo(resource.getId());
        assertThat(persisted.getLocationId()).isNull();
    }

    @Test
    void reporterCannotCreateTicketForUnknownResource() throws Exception {
        CreateTicketRequest request = new CreateTicketRequest(
                "Unknown resource issue", "The selected resource no longer exists.",
                TicketCategory.EQUIPMENT, TicketPriority.MEDIUM, null, UUID.randomUUID());

        mockMvc.perform(post("/api/tickets")
                        .with(jwtFor("student@campus.test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound());

        assertThat(ticketRepository.findAll()).isEmpty();
    }

    @Test
    void secondTicketGetsNextSequentialCode() throws Exception {
        CreateTicketRequest request = new CreateTicketRequest(
                "Ticket A", "Description A", TicketCategory.NETWORK, TicketPriority.LOW, null);

        mockMvc.perform(post("/api/tickets")
                        .with(jwtFor("student@campus.test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        CreateTicketRequest request2 = new CreateTicketRequest(
                "Ticket B", "Description B", TicketCategory.EQUIPMENT, TicketPriority.HIGH, null);

            mockMvc.perform(post("/api/tickets")
                        .with(jwtFor("student@campus.test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request2)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.ticketCode").value(org.hamcrest.Matchers.matchesPattern("TCK-\\d{4}")));
    }

    @Test
    void reporterListsOnlyOwnTickets() throws Exception {
        seedStudent("other@campus.test");
        CreateTicketRequest request = new CreateTicketRequest(
                "My Ticket", "Desc", TicketCategory.OTHER, TicketPriority.LOW, null);

        mockMvc.perform(post("/api/tickets")
                        .with(jwtFor("student@campus.test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/tickets")
                        .with(jwtFor("other@campus.test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateTicketRequest(
                                "Other Ticket", "Desc", TicketCategory.FURNITURE, TicketPriority.LOW, null))))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/tickets")
                        .with(jwtFor("student@campus.test")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$._embedded.tickets.length()").value(1))
                .andExpect(jsonPath("$._embedded.tickets[0].reportedByEmail").value("student@campus.test"));
    }

    @Test
    void ticketManagerListsOnlyAssignedTickets() throws Exception {
        seedStudent("student2@campus.test");
        TicketEntity assigned = assignTicketTo("ticketmgr@campus.test",
                seedTicket("student@campus.test", TicketStatus.OPEN));
        seedTicket("student2@campus.test", TicketStatus.OPEN);

        mockMvc.perform(get("/api/tickets").with(jwtFor("ticketmgr@campus.test")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$._embedded.tickets.length()").value(1))
                .andExpect(jsonPath("$._embedded.tickets[0].id").value(assigned.getId().toString()));
    }

    @Test
    void adminTicketAnalyticsIncludesCampusWideOperationalMetrics() throws Exception {
        Instant now = Instant.now();
        Instant from = now.minus(Duration.ofDays(10));
        Instant to = now.plus(Duration.ofMinutes(5));

        TicketEntity unassignedUrgent = setTicketCreatedAt(
                seedTicket("student@campus.test", TicketStatus.OPEN),
                now.minus(Duration.ofDays(2)));
        unassignedUrgent.setPriority(TicketPriority.URGENT);
        ticketRepository.save(unassignedUrgent);

        TicketEntity resolved = setTicketCreatedAt(
                assignTicketTo("ticketmgr@campus.test", seedTicket("student@campus.test", TicketStatus.RESOLVED)),
                now.minus(Duration.ofDays(4)));
        resolved.setResolvedAt(now.minus(Duration.ofDays(1)));
        ticketRepository.save(resolved);
        seedAssignmentHistory(resolved, null, "ticketmgr@campus.test", "admin@campus.test",
                now.minus(Duration.ofDays(3)));
        seedStatusHistory(resolved, TicketStatus.OPEN, TicketStatus.IN_PROGRESS, "ticketmgr@campus.test",
                now.minus(Duration.ofDays(2)), "Accepted");
        seedStatusHistory(resolved, TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED, "ticketmgr@campus.test",
                now.minus(Duration.ofDays(1)), "Resolved");
        seedComment(resolved, "student@campus.test", "Any update?", now.minus(Duration.ofDays(2)));
        seedComment(resolved, "ticketmgr@campus.test", "Fixed.", now.minus(Duration.ofDays(1)));
        seedAttachment(resolved);

        TicketEntity rejected = setTicketCreatedAt(
                assignTicketTo("ticketmgr@campus.test", seedTicket("student@campus.test", TicketStatus.REJECTED)),
                now.minus(Duration.ofDays(6)));
        ticketRepository.save(rejected);
        seedStatusHistory(rejected, TicketStatus.OPEN, TicketStatus.REJECTED, "ticketmgr@campus.test",
                now.minus(Duration.ofDays(5)), "Duplicate");

        mockMvc.perform(get("/api/tickets/analytics")
                        .param("from", from.toString())
                        .param("to", to.toString())
                        .param("bucket", "DAY")
                        .with(jwtFor("admin@campus.test")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.summary.totalTickets").value(3))
                .andExpect(jsonPath("$.summary.activeBacklog").value(1))
                .andExpect(jsonPath("$.summary.unassignedOpen").value(1))
                .andExpect(jsonPath("$.summary.urgentActive").value(1))
                .andExpect(jsonPath("$.summary.positiveResolutionRate").value(50.0))
                .andExpect(jsonPath("$.summary.rejectionRate").value(50.0))
                .andExpect(jsonPath("$.timing.averageTimeToAssignMinutes").value(1440.0))
                .andExpect(jsonPath("$.timing.averageTimeToAcceptMinutes").value(2880.0))
                .andExpect(jsonPath("$.timing.averageTimeToResolveMinutes").value(4320.0))
                .andExpect(jsonPath("$.communication.totalComments").value(2))
                .andExpect(jsonPath("$.communication.ticketsWithAttachments").value(1))
                .andExpect(jsonPath("$.assignment.totalAssignmentEvents").value(1))
                .andExpect(jsonPath("$.attentionTickets.length()").value(1))
                .andExpect(jsonPath("$.recentStatusEvents.length()").value(org.hamcrest.Matchers.greaterThanOrEqualTo(3)))
                .andExpect(jsonPath("$.managerPerformance.length()").value(1))
                .andExpect(jsonPath("$.managerPerformance[0].assigneeEmail").value("ticketmgr@campus.test"))
                .andExpect(jsonPath("$.managerPerformance[0].assignedTotal").value(2));
    }

    @Test
    void ticketManagerAnalyticsIncludesOnlyAssignedTicketsAndRejectsAdminFilters() throws Exception {
        TicketEntity assigned = assignTicketTo("ticketmgr@campus.test",
                seedTicket("student@campus.test", TicketStatus.OPEN));
        assigned.setPriority(TicketPriority.HIGH);
        ticketRepository.save(assigned);
        seedTicket("student@campus.test", TicketStatus.OPEN);

        mockMvc.perform(get("/api/tickets/analytics")
                        .with(jwtFor("ticketmgr@campus.test")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.summary.totalTickets").value(1))
                .andExpect(jsonPath("$.summary.open").value(1))
                .andExpect(jsonPath("$.summary.unassignedOpen").value(0))
                .andExpect(jsonPath("$.managerPerformance.length()").value(0));

        mockMvc.perform(get("/api/tickets/analytics")
                        .param("unassignedOnly", "true")
                        .with(jwtFor("ticketmgr@campus.test")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        "Ticket managers cannot filter analytics by assignee or unassigned queue."));
    }

    @Test
    void ticketAnalyticsRejectsStudentAndFacultyAccess() throws Exception {
        seedFaculty("faculty@campus.test");

        mockMvc.perform(get("/api/tickets/analytics")
                        .with(jwtFor("student@campus.test")))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/tickets/analytics")
                        .with(jwtFor("faculty@campus.test")))
                .andExpect(status().isForbidden());
    }

    @Test
    void analyticsDateRangeAffectsTrendsButNotSnapshotCounts() throws Exception {
        Instant now = Instant.now();
        Instant from = now.minus(Duration.ofHours(2));
        Instant to = now.plus(Duration.ofMinutes(5));

        setTicketCreatedAt(seedTicket("student@campus.test", TicketStatus.OPEN), now.minus(Duration.ofDays(20)));
        setTicketCreatedAt(seedTicket("student@campus.test", TicketStatus.OPEN), now.minus(Duration.ofMinutes(30)));
        TicketEntity oldResolved = setTicketCreatedAt(
                seedTicket("student@campus.test", TicketStatus.RESOLVED),
                now.minus(Duration.ofDays(20)));
        oldResolved.setResolvedAt(now.minus(Duration.ofDays(15)));
        ticketRepository.save(oldResolved);
        TicketEntity oldRejected = setTicketCreatedAt(
                seedTicket("student@campus.test", TicketStatus.REJECTED),
                now.minus(Duration.ofDays(18)));
        seedStatusHistory(oldRejected, TicketStatus.OPEN, TicketStatus.REJECTED, "ticketmgr@campus.test",
                now.minus(Duration.ofDays(14)), "Out of window");

        mockMvc.perform(get("/api/tickets/analytics")
                        .param("from", from.toString())
                        .param("to", to.toString())
                        .param("bucket", "MONTH")
                        .with(jwtFor("admin@campus.test")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.summary.totalTickets").value(4))
                .andExpect(jsonPath("$.summary.resolved").value(1))
                .andExpect(jsonPath("$.summary.rejected").value(1))
                .andExpect(jsonPath("$.summary.positiveResolutionRate").doesNotExist())
                .andExpect(jsonPath("$.summary.rejectionRate").doesNotExist())
                .andExpect(jsonPath("$.trends.length()").value(1))
                .andExpect(jsonPath("$.trends[0].created").value(1));
    }

    @Test
    void emptyTicketAnalyticsReturnsZeroCountsAndNullAverages() throws Exception {
        UUID unknownAssignee = UUID.randomUUID();

        mockMvc.perform(get("/api/tickets/analytics")
                        .param("assigneeId", unknownAssignee.toString())
                        .with(jwtFor("admin@campus.test")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.summary.totalTickets").value(0))
                .andExpect(jsonPath("$.summary.activeBacklog").value(0))
                .andExpect(jsonPath("$.timing.averageTimeToResolveMinutes").doesNotExist())
                .andExpect(jsonPath("$.communication.totalComments").value(0))
                .andExpect(jsonPath("$.trends.length()").value(org.hamcrest.Matchers.greaterThan(0)));
    }

    @Test
    void reporterGets403OnAnotherUsersTicket() throws Exception {
        seedStudent("other2@campus.test");
        TicketEntity ticket = seedTicket("other2@campus.test", TicketStatus.OPEN);

        mockMvc.perform(get("/api/tickets/{id}", ticket.getId())
                        .with(jwtFor("student@campus.test")))
                .andExpect(status().isForbidden());
    }

    @Test
    void ticketManagerCanGetAssignedTicket() throws Exception {
        TicketEntity ticket = assignTicketTo("ticketmgr@campus.test",
                seedTicket("student@campus.test", TicketStatus.OPEN));

        mockMvc.perform(get("/api/tickets/{id}", ticket.getId())
                        .with(jwtFor("ticketmgr@campus.test")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(ticket.getId().toString()))
                .andExpect(jsonPath("$._links.self.href").exists());
    }

    @Test
    void ticketManagerCannotGetUnassignedTicket() throws Exception {
        TicketEntity ticket = seedTicket("student@campus.test", TicketStatus.OPEN);

        mockMvc.perform(get("/api/tickets/{id}", ticket.getId())
                        .with(jwtFor("ticketmgr@campus.test")))
                .andExpect(status().isForbidden());
    }

    @Test
    void ticketManagerCannotOperateOnUnassignedTicket() throws Exception {
        TicketEntity ticket = seedTicket("student@campus.test", TicketStatus.OPEN);
        TicketAttachmentEntity attachment = seedAttachment(ticket);

        TicketStatusUpdateRequest statusRequest = new TicketStatusUpdateRequest(
                TicketStatus.IN_PROGRESS, null, null, null, null);
        AddCommentRequest commentRequest = new AddCommentRequest("Taking a look.");
        AddTicketAttachmentRequest attachmentRequest = new AddTicketAttachmentRequest(
                "network-log.txt", "https://files.campus.test/network-log.txt", "text/plain");

        mockMvc.perform(put("/api/tickets/{id}/status", ticket.getId())
                        .with(jwtFor("ticketmgr@campus.test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(statusRequest)))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/tickets/{id}/comments", ticket.getId())
                        .with(jwtFor("ticketmgr@campus.test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(commentRequest)))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/tickets/{id}/attachments", ticket.getId())
                        .with(jwtFor("ticketmgr@campus.test")))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/tickets/{id}/attachments", ticket.getId())
                        .with(jwtFor("ticketmgr@campus.test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(attachmentRequest)))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/api/tickets/{id}/attachments/{attachmentId}", ticket.getId(), attachment.getId())
                        .with(jwtFor("ticketmgr@campus.test")))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/tickets/{id}/history", ticket.getId())
                        .with(jwtFor("ticketmgr@campus.test")))
                .andExpect(status().isForbidden());
    }

    @Test
    void reporterCannotUpdateTicketStatus() throws Exception {
        TicketEntity ticket = seedTicket("student@campus.test", TicketStatus.OPEN);
        TicketStatusUpdateRequest request = new TicketStatusUpdateRequest(
                TicketStatus.IN_PROGRESS, null, null, null, null);

        mockMvc.perform(put("/api/tickets/{id}/status", ticket.getId())
                        .with(jwtFor("student@campus.test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminCanAssignTicketToTicketManager() throws Exception {
        TicketEntity ticket = seedTicket("student@campus.test", TicketStatus.OPEN);
        UserEntity manager = userRepository.findByEmailIgnoreCase("ticketmgr@campus.test").orElseThrow();
        AssignTicketRequest request = new AssignTicketRequest(manager.getId());

        mockMvc.perform(put("/api/tickets/{id}/assign", ticket.getId())
                        .with(jwtFor("admin@campus.test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assignedToEmail").value("ticketmgr@campus.test"));
    }

    @Test
    void adminCanReassignOpenTicket() throws Exception {
        seedAdmin("otheradmin@campus.test");
        TicketEntity ticket = assignTicketTo("ticketmgr@campus.test",
                seedTicket("student@campus.test", TicketStatus.OPEN));
        UserEntity otherAdmin = userRepository.findByEmailIgnoreCase("otheradmin@campus.test").orElseThrow();
        AssignTicketRequest request = new AssignTicketRequest(otherAdmin.getId());

        mockMvc.perform(put("/api/tickets/{id}/assign", ticket.getId())
                        .with(jwtFor("admin@campus.test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assignedToEmail").value("otheradmin@campus.test"));
    }

    @Test
    void adminCanAssignTicketToAdmin() throws Exception {
        TicketEntity ticket = seedTicket("student@campus.test", TicketStatus.OPEN);
        UserEntity admin = userRepository.findByEmailIgnoreCase("admin@campus.test").orElseThrow();
        AssignTicketRequest request = new AssignTicketRequest(admin.getId());

        mockMvc.perform(put("/api/tickets/{id}/assign", ticket.getId())
                        .with(jwtFor("admin@campus.test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assignedToEmail").value("admin@campus.test"));
    }

    @Test
    void adminCannotReassignTicketAfterAcceptance() throws Exception {
        UserEntity manager = userRepository.findByEmailIgnoreCase("ticketmgr@campus.test").orElseThrow();
        UserEntity admin = userRepository.findByEmailIgnoreCase("admin@campus.test").orElseThrow();

        for (TicketStatus ticketStatus : new TicketStatus[] {
                TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED, TicketStatus.CLOSED, TicketStatus.REJECTED }) {
            TicketEntity ticket = assignTicketTo("admin@campus.test",
                    seedTicket("student@campus.test", ticketStatus));
            AssignTicketRequest request = new AssignTicketRequest(manager.getId());

            mockMvc.perform(put("/api/tickets/{id}/assign", ticket.getId())
                            .with(jwtFor("admin@campus.test"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value(
                            "Tickets cannot be reassigned after they are accepted."));

            TicketEntity persisted = ticketRepository.findById(ticket.getId()).orElseThrow();
            assertThat(persisted.getAssignedTo().getId()).isEqualTo(admin.getId());
            assertThat(persisted.getStatus()).isEqualTo(ticketStatus);
        }
    }

    @Test
    void adminCannotAssignTicketToStudentFacultyWrongManagerRoleOrInactiveTicketManager() throws Exception {
        TicketEntity ticket = seedTicket("student@campus.test", TicketStatus.OPEN);
        UserEntity student = userRepository.findByEmailIgnoreCase("student@campus.test").orElseThrow();
        UserEntity faculty = seedFaculty("faculty@campus.test");
        UserEntity catalogManager = seedManager("catalogmgr@campus.test", ManagerRole.CATALOG_MANAGER,
                AccountStatus.ACTIVE);
        UserEntity suspendedTicketManager = seedManager("inactive-ticketmgr@campus.test", ManagerRole.TICKET_MANAGER,
                AccountStatus.SUSPENDED);

        assertInvalidAssignment(ticket, student);
        assertInvalidAssignment(ticket, faculty);
        assertInvalidAssignment(ticket, catalogManager);
        assertInvalidAssignment(ticket, suspendedTicketManager);
        assertThat(ticketRepository.findById(ticket.getId()).orElseThrow().getAssignedTo()).isNull();
    }

    @Test
    void statusUpdateRejectsAssignmentPayload() throws Exception {
        TicketEntity ticket = assignTicketTo("ticketmgr@campus.test",
                seedTicket("student@campus.test", TicketStatus.OPEN));
        UserEntity student = userRepository.findByEmailIgnoreCase("student@campus.test").orElseThrow();
        TicketStatusUpdateRequest request = new TicketStatusUpdateRequest(
                TicketStatus.IN_PROGRESS, "Started working on it.", student.getId(), null, null);

        mockMvc.perform(put("/api/tickets/{id}/status", ticket.getId())
                        .with(jwtFor("ticketmgr@campus.test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        "Ticket assignment must use the assignment endpoint."));

        TicketEntity persisted = ticketRepository.findById(ticket.getId()).orElseThrow();
        UserEntity manager = userRepository.findByEmailIgnoreCase("ticketmgr@campus.test").orElseThrow();
        assertThat(persisted.getAssignedTo().getId()).isEqualTo(manager.getId());
        assertThat(persisted.getStatus()).isEqualTo(TicketStatus.OPEN);
    }

    @Test
    void ticketManagerCannotAssignTicketToSelf() throws Exception {
        TicketEntity ticket = seedTicket("student@campus.test", TicketStatus.OPEN);
        UserEntity manager = userRepository.findByEmailIgnoreCase("ticketmgr@campus.test").orElseThrow();
        AssignTicketRequest request = new AssignTicketRequest(manager.getId());

        mockMvc.perform(put("/api/tickets/{id}/assign", ticket.getId())
                        .with(jwtFor("ticketmgr@campus.test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());

        assertThat(ticketRepository.findById(ticket.getId()).orElseThrow().getAssignedTo()).isNull();
    }

    @Test
    void ticketManagerTransitionsOpenToInProgress() throws Exception {
        TicketEntity ticket = assignTicketTo("ticketmgr@campus.test",
                seedTicket("student@campus.test", TicketStatus.OPEN));
        TicketStatusUpdateRequest request = new TicketStatusUpdateRequest(
                TicketStatus.IN_PROGRESS, "Started working on it.", null, null, null);

        mockMvc.perform(put("/api/tickets/{id}/status", ticket.getId())
                        .with(jwtFor("ticketmgr@campus.test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"))
                .andExpect(jsonPath("$.assignedToEmail").value("ticketmgr@campus.test"));
    }

    @Test
    void adminCannotAcceptUnassignedTicket() throws Exception {
        TicketEntity ticket = seedTicket("student@campus.test", TicketStatus.OPEN);
        TicketStatusUpdateRequest request = new TicketStatusUpdateRequest(
                TicketStatus.IN_PROGRESS, null, null, null, null);

        mockMvc.perform(put("/api/tickets/{id}/status", ticket.getId())
                        .with(jwtFor("admin@campus.test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(
                        "Admins can only update tickets assigned to themselves."));

        assertThat(ticketRepository.findById(ticket.getId()).orElseThrow().getStatus())
                .isEqualTo(TicketStatus.OPEN);
    }

    @Test
    void adminCannotAcceptTicketAssignedToSomeoneElse() throws Exception {
        seedAdmin("otheradmin@campus.test");
        TicketStatusUpdateRequest request = new TicketStatusUpdateRequest(
                TicketStatus.IN_PROGRESS, null, null, null, null);

        for (String assigneeEmail : new String[] { "ticketmgr@campus.test", "otheradmin@campus.test" }) {
            TicketEntity ticket = assignTicketTo(assigneeEmail,
                    seedTicket("student@campus.test", TicketStatus.OPEN));

            mockMvc.perform(put("/api/tickets/{id}/status", ticket.getId())
                            .with(jwtFor("admin@campus.test"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.message").value(
                            "Admins can only update tickets assigned to themselves."));

            assertThat(ticketRepository.findById(ticket.getId()).orElseThrow().getStatus())
                    .isEqualTo(TicketStatus.OPEN);
        }
    }

    @Test
    void adminCanAcceptTicketAssignedToSelf() throws Exception {
        TicketEntity ticket = assignTicketTo("admin@campus.test",
                seedTicket("student@campus.test", TicketStatus.OPEN));
        TicketStatusUpdateRequest request = new TicketStatusUpdateRequest(
                TicketStatus.IN_PROGRESS, "Started working on it.", null, null, null);

        mockMvc.perform(put("/api/tickets/{id}/status", ticket.getId())
                        .with(jwtFor("admin@campus.test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"))
                .andExpect(jsonPath("$.assignedToEmail").value("admin@campus.test"));
    }

    @Test
    void adminCannotResolveRejectOrCloseTicketAssignedToSomeoneElse() throws Exception {
        TicketStatusUpdateRequest resolveRequest = new TicketStatusUpdateRequest(
                TicketStatus.RESOLVED, "Resolved note.", null, "Resolved by another user.", null);
        TicketStatusUpdateRequest rejectRequest = new TicketStatusUpdateRequest(
                TicketStatus.REJECTED, "Reject note.", null, null, "Rejected by another user.");
        TicketStatusUpdateRequest closeRequest = new TicketStatusUpdateRequest(
                TicketStatus.CLOSED, "Close note.", null, null, null);

        assertAdminCannotUpdateOtherUsersTicket(resolveRequest);
        assertAdminCannotUpdateOtherUsersTicket(rejectRequest);
        assertAdminCannotUpdateOtherUsersTicket(closeRequest);
    }

    @Test
    void adminCanResolveOwnInProgressTicket() throws Exception {
        TicketEntity ticket = assignTicketTo("admin@campus.test",
                seedTicket("student@campus.test", TicketStatus.IN_PROGRESS));
        TicketStatusUpdateRequest request = new TicketStatusUpdateRequest(
                TicketStatus.RESOLVED, null, null, "Restarted the access point.", null);

        mockMvc.perform(put("/api/tickets/{id}/status", ticket.getId())
                        .with(jwtFor("admin@campus.test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RESOLVED"))
                .andExpect(jsonPath("$.resolutionNotes").value("Restarted the access point."))
                .andExpect(jsonPath("$.assignedToEmail").value("admin@campus.test"));
    }

    @Test
    void ticketManagerTransitionsInProgressToResolved() throws Exception {
        TicketEntity ticket = assignTicketTo("ticketmgr@campus.test",
                seedTicket("student@campus.test", TicketStatus.IN_PROGRESS));

        TicketStatusUpdateRequest request = new TicketStatusUpdateRequest(
                TicketStatus.RESOLVED, null, null, "Replaced the faulty switch.", null);

        mockMvc.perform(put("/api/tickets/{id}/status", ticket.getId())
                        .with(jwtFor("ticketmgr@campus.test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RESOLVED"))
                .andExpect(jsonPath("$.resolutionNotes").value("Replaced the faulty switch."))
                .andExpect(jsonPath("$.resolvedAt").isNotEmpty());
    }

    @Test
    void ticketManagerCanRejectTicket() throws Exception {
        TicketEntity ticket = assignTicketTo("ticketmgr@campus.test",
                seedTicket("student@campus.test", TicketStatus.IN_PROGRESS));

        TicketStatusUpdateRequest request = new TicketStatusUpdateRequest(
                TicketStatus.REJECTED, null, null, null, "Duplicate of TCK-0001.");

        mockMvc.perform(put("/api/tickets/{id}/status", ticket.getId())
                        .with(jwtFor("ticketmgr@campus.test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"))
                .andExpect(jsonPath("$.rejectionReason").value("Duplicate of TCK-0001."));
    }

    @Test
    void rejectWithoutReasonReturnsBadRequest() throws Exception {
        TicketEntity ticket = assignTicketTo("ticketmgr@campus.test",
                seedTicket("student@campus.test", TicketStatus.IN_PROGRESS));

        TicketStatusUpdateRequest request = new TicketStatusUpdateRequest(
                TicketStatus.REJECTED, null, null, null, null);

        mockMvc.perform(put("/api/tickets/{id}/status", ticket.getId())
                        .with(jwtFor("ticketmgr@campus.test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Rejection reason is required when rejecting a ticket."));
    }

    @Test
    void resolveWithoutNotesReturnsBadRequest() throws Exception {
        TicketEntity ticket = assignTicketTo("ticketmgr@campus.test",
                seedTicket("student@campus.test", TicketStatus.IN_PROGRESS));

        TicketStatusUpdateRequest request = new TicketStatusUpdateRequest(
                TicketStatus.RESOLVED, null, null, null, null);

        mockMvc.perform(put("/api/tickets/{id}/status", ticket.getId())
                        .with(jwtFor("ticketmgr@campus.test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Resolution notes are required when resolving a ticket."));
    }

    @Test
    void ticketManagerCanCloseResolvedTicket() throws Exception {
        TicketEntity ticket = assignTicketTo("ticketmgr@campus.test",
                seedTicket("student@campus.test", TicketStatus.RESOLVED));

        TicketStatusUpdateRequest request = new TicketStatusUpdateRequest(
                TicketStatus.CLOSED, "Confirmed with reporter.", null, null, null);

        mockMvc.perform(put("/api/tickets/{id}/status", ticket.getId())
                        .with(jwtFor("ticketmgr@campus.test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CLOSED"))
                .andExpect(jsonPath("$.closedAt").isNotEmpty());
    }

    @Test
    void ticketManagerCanCloseRejectedTicket() throws Exception {
        TicketEntity ticket = assignTicketTo("ticketmgr@campus.test",
                seedTicket("student@campus.test", TicketStatus.REJECTED));

        TicketStatusUpdateRequest request = new TicketStatusUpdateRequest(
                TicketStatus.CLOSED, "Rejected and closed.", null, null, null);

        mockMvc.perform(put("/api/tickets/{id}/status", ticket.getId())
                        .with(jwtFor("ticketmgr@campus.test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CLOSED"))
                .andExpect(jsonPath("$.closedAt").isNotEmpty());
    }

    @Test
    void inProgressCannotTransitionDirectlyToClosed() throws Exception {
        TicketEntity ticket = assignTicketTo("ticketmgr@campus.test",
                seedTicket("student@campus.test", TicketStatus.IN_PROGRESS));

        TicketStatusUpdateRequest request = new TicketStatusUpdateRequest(
                TicketStatus.CLOSED, "Closing directly.", null, null, null);

        mockMvc.perform(put("/api/tickets/{id}/status", ticket.getId())
                        .with(jwtFor("ticketmgr@campus.test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid ticket status transition."));

        assertThat(ticketRepository.findById(ticket.getId()).orElseThrow().getStatus())
                .isEqualTo(TicketStatus.IN_PROGRESS);
    }

    @Test
    void openCannotTransitionToResolved() throws Exception {
        TicketEntity ticket = assignTicketTo("ticketmgr@campus.test",
                seedTicket("student@campus.test", TicketStatus.OPEN));

        TicketStatusUpdateRequest request = new TicketStatusUpdateRequest(
                TicketStatus.RESOLVED, null, null, "Resolved without accepting.", null);

        mockMvc.perform(put("/api/tickets/{id}/status", ticket.getId())
                        .with(jwtFor("ticketmgr@campus.test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid ticket status transition."));

        assertThat(ticketRepository.findById(ticket.getId()).orElseThrow().getStatus())
                .isEqualTo(TicketStatus.OPEN);
    }

    @Test
    void openCannotTransitionToRejected() throws Exception {
        TicketEntity ticket = assignTicketTo("ticketmgr@campus.test",
                seedTicket("student@campus.test", TicketStatus.OPEN));

        TicketStatusUpdateRequest request = new TicketStatusUpdateRequest(
                TicketStatus.REJECTED, null, null, null, "Rejected without accepting.");

        mockMvc.perform(put("/api/tickets/{id}/status", ticket.getId())
                        .with(jwtFor("ticketmgr@campus.test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid ticket status transition."));

        assertThat(ticketRepository.findById(ticket.getId()).orElseThrow().getStatus())
                .isEqualTo(TicketStatus.OPEN);
    }

    @Test
    void sameStatusTransitionReturnsBadRequest() throws Exception {
        TicketEntity ticket = assignTicketTo("ticketmgr@campus.test",
                seedTicket("student@campus.test", TicketStatus.IN_PROGRESS));

        TicketStatusUpdateRequest request = new TicketStatusUpdateRequest(
                TicketStatus.IN_PROGRESS, "Still in progress.", null, null, null);

        mockMvc.perform(put("/api/tickets/{id}/status", ticket.getId())
                        .with(jwtFor("ticketmgr@campus.test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("No status transition requested."));
    }

    @Test
    void reporterCanDeleteOwnUnassignedOpenTicket() throws Exception {
        TicketEntity ticket = seedTicket("student@campus.test", TicketStatus.OPEN);

        mockMvc.perform(get("/api/tickets/{id}", ticket.getId())
                        .with(jwtFor("student@campus.test")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$._links['delete-ticket'].href").exists());

        mockMvc.perform(delete("/api/tickets/{id}", ticket.getId())
                        .with(jwtFor("student@campus.test")))
                .andExpect(status().isNoContent());

        assertThat(ticketRepository.findById(ticket.getId())).isEmpty();

        mockMvc.perform(get("/api/tickets/{id}", ticket.getId())
                        .with(jwtFor("student@campus.test")))
                .andExpect(status().isNotFound());
    }

    @Test
    void reporterCannotDeleteOwnAssignedOpenTicket() throws Exception {
        TicketEntity ticket = assignTicketTo("ticketmgr@campus.test",
                seedTicket("student@campus.test", TicketStatus.OPEN));

        mockMvc.perform(get("/api/tickets/{id}", ticket.getId())
                        .with(jwtFor("student@campus.test")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$._links['delete-ticket']").doesNotExist());

        mockMvc.perform(delete("/api/tickets/{id}", ticket.getId())
                        .with(jwtFor("student@campus.test")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        "Tickets can only be deleted by the reporter before assignment."));

        assertThat(ticketRepository.findById(ticket.getId())).isPresent();
    }

    @Test
    void reporterCannotDeleteAnotherReportersTicket() throws Exception {
        seedStudent("other5@campus.test");
        TicketEntity ticket = seedTicket("other5@campus.test", TicketStatus.OPEN);

        mockMvc.perform(delete("/api/tickets/{id}", ticket.getId())
                        .with(jwtFor("student@campus.test")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Only the ticket reporter or admin can delete tickets."));

        assertThat(ticketRepository.findById(ticket.getId())).isPresent();
    }

    @Test
    void assignedTicketManagerCannotDeleteAssignedTicket() throws Exception {
        TicketEntity ticket = assignTicketTo("ticketmgr@campus.test",
                seedTicket("student@campus.test", TicketStatus.OPEN));

        mockMvc.perform(delete("/api/tickets/{id}", ticket.getId())
                        .with(jwtFor("ticketmgr@campus.test")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Only the ticket reporter or admin can delete tickets."));

        assertThat(ticketRepository.findById(ticket.getId())).isPresent();
    }

    @Test
    void adminCanDeleteClosedTickets() throws Exception {
        TicketEntity ticket = seedTicket("student@campus.test", TicketStatus.CLOSED);

        mockMvc.perform(delete("/api/tickets/{id}", ticket.getId())
                        .with(jwtFor("admin@campus.test")))
                .andExpect(status().isNoContent());

        assertThat(ticketRepository.findById(ticket.getId())).isEmpty();
    }

    @Test
    void adminCannotDeleteNonClosedTickets() throws Exception {
        for (TicketStatus status : new TicketStatus[] {
                TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED, TicketStatus.REJECTED }) {
            TicketEntity ticket = seedTicket("student@campus.test", status);

            mockMvc.perform(delete("/api/tickets/{id}", ticket.getId())
                            .with(jwtFor("admin@campus.test")))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value(
                            "Admins can only delete closed tickets."));

            assertThat(ticketRepository.findById(ticket.getId())).isPresent();
        }
    }

    @Test
    void adminGetsDeleteLinkOnlyForClosedTickets() throws Exception {
        for (TicketStatus status : TicketStatus.values()) {
            TicketEntity ticket = seedTicket("student@campus.test", status);

            var response = mockMvc.perform(get("/api/tickets/{id}", ticket.getId())
                            .with(jwtFor("admin@campus.test")))
                    .andExpect(status().isOk());

            if (status == TicketStatus.CLOSED) {
                response.andExpect(jsonPath("$._links['delete-ticket'].href").exists());
            } else {
                response.andExpect(jsonPath("$._links['delete-ticket']").doesNotExist());
            }
        }
    }

    @Test
    void deleteTicketRemovesChildRowsAndAttachmentFiles() throws Exception {
        TicketEntity ticket = seedTicket("student@campus.test", TicketStatus.OPEN);
        TicketCommentEntity comment = seedComment(
                ticket, "student@campus.test", "Delete with ticket.", Instant.parse("2026-04-20T08:00:00Z"));
        TicketAttachmentEntity firstAttachment = seedAttachment(ticket, "https://files.campus.test/first.pdf");
        TicketAttachmentEntity secondAttachment = seedAttachment(ticket, "https://files.campus.test/second.pdf");

        assertThat(ticketStatusHistoryRepository.findByTicketIdOrderByChangedAtAsc(ticket.getId())).hasSize(1);

        mockMvc.perform(delete("/api/tickets/{id}", ticket.getId())
                        .with(jwtFor("student@campus.test")))
                .andExpect(status().isNoContent());

        assertThat(ticketRepository.findById(ticket.getId())).isEmpty();
        assertThat(ticketCommentRepository.findById(comment.getId())).isEmpty();
        assertThat(ticketAttachmentRepository.findById(firstAttachment.getId())).isEmpty();
        assertThat(ticketAttachmentRepository.findById(secondAttachment.getId())).isEmpty();
        assertThat(ticketStatusHistoryRepository.findByTicketIdOrderByChangedAtAsc(ticket.getId())).isEmpty();
        assertThat(ticketAttachmentStorageClient.deletedUrls()).containsExactlyInAnyOrder(
                "https://files.campus.test/first.pdf",
                "https://files.campus.test/second.pdf");
    }

    @Test
    void reporterCanAddComment() throws Exception {
        TicketEntity ticket = seedTicket("student@campus.test", TicketStatus.OPEN);
        AddCommentRequest request = new AddCommentRequest("Please prioritise this, it's causing issues.");

        mockMvc.perform(post("/api/tickets/{id}/comments", ticket.getId())
                        .with(jwtFor("student@campus.test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.commentText").value("Please prioritise this, it's causing issues."))
                .andExpect(jsonPath("$.userEmail").value("student@campus.test"))
                .andExpect(jsonPath("$.isEdited").value(false))
                .andExpect(jsonPath("$._links.self.href").exists())
                .andExpect(jsonPath("$._links['edit-comment'].href").exists());
    }

    @Test
    void getCommentReturnsHalResource() throws Exception {
        TicketEntity ticket = seedTicket("student@campus.test", TicketStatus.OPEN);
        TicketCommentEntity comment = seedComment(
                ticket, "student@campus.test", "Existing note.", Instant.parse("2026-04-20T08:00:00Z"));

        mockMvc.perform(get("/api/tickets/{id}/comments/{commentId}", ticket.getId(), comment.getId())
                        .with(jwtFor("student@campus.test")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.commentText").value("Existing note."))
                .andExpect(jsonPath("$._links.self.href").exists())
                .andExpect(jsonPath("$._links.ticket.href").exists())
                .andExpect(jsonPath("$._links.comments.href").exists());
    }

    @Test
    void ticketManagerCanAddComment() throws Exception {
        TicketEntity ticket = assignTicketTo("ticketmgr@campus.test",
                seedTicket("student@campus.test", TicketStatus.IN_PROGRESS));
        AddCommentRequest request = new AddCommentRequest("We will look into this tomorrow.");

        mockMvc.perform(post("/api/tickets/{id}/comments", ticket.getId())
                        .with(jwtFor("ticketmgr@campus.test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.userEmail").value("ticketmgr@campus.test"))
                .andExpect(jsonPath("$._links.self.href").exists());
    }

    @Test
    void adminCanAddCommentToAnyInProgressTicket() throws Exception {
        TicketEntity ticket = assignTicketTo("ticketmgr@campus.test",
                seedTicket("student@campus.test", TicketStatus.IN_PROGRESS));
        AddCommentRequest request = new AddCommentRequest("Following up as admin.");

        mockMvc.perform(post("/api/tickets/{id}/comments", ticket.getId())
                        .with(jwtFor("admin@campus.test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.userEmail").value("admin@campus.test"))
                .andExpect(jsonPath("$.commentText").value("Following up as admin."))
                .andExpect(jsonPath("$._links.self.href").exists());
    }

    @Test
    void adminCannotAddCommentToOpenOrResolvedTicket() throws Exception {
        AddCommentRequest request = new AddCommentRequest("Admin comment.");

        for (TicketStatus ticketStatus : new TicketStatus[] { TicketStatus.OPEN, TicketStatus.RESOLVED }) {
            TicketEntity ticket = assignTicketTo("ticketmgr@campus.test",
                    seedTicket("student@campus.test", ticketStatus));

            mockMvc.perform(post("/api/tickets/{id}/comments", ticket.getId())
                            .with(jwtFor("admin@campus.test"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value(
                            "Admins can only comment on in-progress tickets."));
        }
    }

    @Test
    void commentAuthorCanEditOwnLatestComment() throws Exception {
        TicketEntity ticket = seedTicket("student@campus.test", TicketStatus.OPEN);
        TicketCommentEntity comment = seedComment(
                ticket, "student@campus.test", "Original note.", Instant.parse("2026-04-20T08:00:00Z"));
        UpdateCommentRequest request = new UpdateCommentRequest("Updated note.");

        mockMvc.perform(patch("/api/tickets/{id}/comments/{commentId}", ticket.getId(), comment.getId())
                        .with(jwtFor("student@campus.test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.commentText").value("Updated note."))
                .andExpect(jsonPath("$.isEdited").value(true))
                .andExpect(jsonPath("$._links['edit-comment'].href").exists())
                .andExpect(jsonPath("$._links['delete-comment'].href").exists());

        TicketCommentEntity persisted = ticketCommentRepository.findById(comment.getId()).orElseThrow();
        assertThat(persisted.getCommentText()).isEqualTo("Updated note.");
        assertThat(persisted.isEdited()).isTrue();
    }

    @Test
    void assignedTicketManagerCanEditOwnLatestComment() throws Exception {
        TicketEntity ticket = assignTicketTo("ticketmgr@campus.test",
                seedTicket("student@campus.test", TicketStatus.IN_PROGRESS));
        seedComment(ticket, "student@campus.test", "Student update.", Instant.parse("2026-04-20T08:00:00Z"));
        TicketCommentEntity managerComment = seedComment(
                ticket, "ticketmgr@campus.test", "Manager note.", Instant.parse("2026-04-20T09:00:00Z"));
        UpdateCommentRequest request = new UpdateCommentRequest("Manager note, edited.");

        mockMvc.perform(patch("/api/tickets/{id}/comments/{commentId}", ticket.getId(), managerComment.getId())
                        .with(jwtFor("ticketmgr@campus.test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.commentText").value("Manager note, edited."))
                .andExpect(jsonPath("$.isEdited").value(true));
    }

    @Test
    void adminCannotEditAnotherUsersLatestComment() throws Exception {
        TicketEntity ticket = seedTicket("student@campus.test", TicketStatus.RESOLVED);
        TicketCommentEntity comment = seedComment(
                ticket, "student@campus.test", "Student final note.", Instant.parse("2026-04-20T08:00:00Z"));
        UpdateCommentRequest request = new UpdateCommentRequest("Admin rewrite.");

        mockMvc.perform(patch("/api/tickets/{id}/comments/{commentId}", ticket.getId(), comment.getId())
                        .with(jwtFor("admin@campus.test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("You can only edit your own comments."));

        assertThat(ticketCommentRepository.findById(comment.getId()).orElseThrow().getCommentText())
                .isEqualTo("Student final note.");
    }

    @Test
    void reporterCannotEditAnotherUsersLatestCommentOnOwnTicket() throws Exception {
        TicketEntity ticket = assignTicketTo("ticketmgr@campus.test",
                seedTicket("student@campus.test", TicketStatus.IN_PROGRESS));
        TicketCommentEntity managerComment = seedComment(
                ticket, "ticketmgr@campus.test", "Manager update.", Instant.parse("2026-04-20T08:00:00Z"));
        UpdateCommentRequest request = new UpdateCommentRequest("Reporter rewrite.");

        mockMvc.perform(patch("/api/tickets/{id}/comments/{commentId}", ticket.getId(), managerComment.getId())
                        .with(jwtFor("student@campus.test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("You can only edit your own comments."));

        assertThat(ticketCommentRepository.findById(managerComment.getId()).orElseThrow().getCommentText())
                .isEqualTo("Manager update.");
    }

    @Test
    void authorCannotEditOlderComment() throws Exception {
        TicketEntity ticket = seedTicket("student@campus.test", TicketStatus.OPEN);
        TicketCommentEntity olderComment = seedComment(
                ticket, "student@campus.test", "First note.", Instant.parse("2026-04-20T08:00:00Z"));
        seedComment(ticket, "student@campus.test", "Newer note.", Instant.parse("2026-04-20T09:00:00Z"));
        UpdateCommentRequest request = new UpdateCommentRequest("Edited first note.");

        mockMvc.perform(patch("/api/tickets/{id}/comments/{commentId}", ticket.getId(), olderComment.getId())
                        .with(jwtFor("student@campus.test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Only the latest ticket comment can be edited."));

        assertThat(ticketCommentRepository.findById(olderComment.getId()).orElseThrow().getCommentText())
                .isEqualTo("First note.");
    }

    @Test
    void editCommentWithMismatchedTicketReturnsNotFound() throws Exception {
        TicketEntity ticket = seedTicket("student@campus.test", TicketStatus.OPEN);
        TicketEntity otherTicket = seedTicket("student@campus.test", TicketStatus.OPEN);
        TicketCommentEntity comment = seedComment(
                ticket, "student@campus.test", "Ticket comment.", Instant.parse("2026-04-20T08:00:00Z"));
        UpdateCommentRequest request = new UpdateCommentRequest("Updated note.");

        mockMvc.perform(patch("/api/tickets/{id}/comments/{commentId}", otherTicket.getId(), comment.getId())
                        .with(jwtFor("student@campus.test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Ticket comment not found."));
    }

    @Test
    void userCannotEditCommentOnInaccessibleTicket() throws Exception {
        seedStudent("other-edit@campus.test");
        TicketEntity ticket = seedTicket("other-edit@campus.test", TicketStatus.OPEN);
        TicketCommentEntity comment = seedComment(
                ticket, "other-edit@campus.test", "Private note.", Instant.parse("2026-04-20T08:00:00Z"));
        UpdateCommentRequest request = new UpdateCommentRequest("Updated private note.");

        mockMvc.perform(patch("/api/tickets/{id}/comments/{commentId}", ticket.getId(), comment.getId())
                        .with(jwtFor("student@campus.test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());

        assertThat(ticketCommentRepository.findById(comment.getId()).orElseThrow().getCommentText())
                .isEqualTo("Private note.");
    }

    @Test
    void blankEditCommentTextReturnsBadRequest() throws Exception {
        TicketEntity ticket = seedTicket("student@campus.test", TicketStatus.OPEN);
        TicketCommentEntity comment = seedComment(
                ticket, "student@campus.test", "Original note.", Instant.parse("2026-04-20T08:00:00Z"));
        UpdateCommentRequest request = new UpdateCommentRequest(" ");

        mockMvc.perform(patch("/api/tickets/{id}/comments/{commentId}", ticket.getId(), comment.getId())
                        .with(jwtFor("student@campus.test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());

        assertThat(ticketCommentRepository.findById(comment.getId()).orElseThrow().getCommentText())
                .isEqualTo("Original note.");
    }

    @Test
    void commentCollectionIncludesEditOnlyForLatestAuthoredComment() throws Exception {
        TicketEntity ticket = seedTicket("student@campus.test", TicketStatus.OPEN);
        seedComment(ticket, "student@campus.test", "First note.", Instant.parse("2026-04-20T08:00:00Z"));
        seedComment(ticket, "student@campus.test", "Newer note.", Instant.parse("2026-04-20T09:00:00Z"));

        mockMvc.perform(get("/api/tickets/{id}/comments", ticket.getId())
                        .with(jwtFor("student@campus.test")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$._embedded.comments.length()").value(2))
                .andExpect(jsonPath("$._embedded.comments[0]._links['edit-comment']").doesNotExist())
                .andExpect(jsonPath("$._embedded.comments[0]._links['delete-comment']").doesNotExist())
                .andExpect(jsonPath("$._embedded.comments[1]._links['edit-comment'].href").exists())
                .andExpect(jsonPath("$._embedded.comments[1]._links['delete-comment'].href").exists());
    }

    @Test
    void adminCommentCollectionCanDeleteButNotEditAnotherUsersLatestComment() throws Exception {
        TicketEntity ticket = seedTicket("student@campus.test", TicketStatus.RESOLVED);
        seedComment(ticket, "student@campus.test", "Final student note.", Instant.parse("2026-04-20T08:00:00Z"));

        mockMvc.perform(get("/api/tickets/{id}/comments", ticket.getId())
                        .with(jwtFor("admin@campus.test")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$._embedded.comments.length()").value(1))
                .andExpect(jsonPath("$._embedded.comments[0]._links['edit-comment']").doesNotExist())
                .andExpect(jsonPath("$._embedded.comments[0]._links['delete-comment'].href").exists());
    }

    @Test
    void reporterCanDeleteOwnLatestComment() throws Exception {
        TicketEntity ticket = seedTicket("student@campus.test", TicketStatus.OPEN);
        TicketCommentEntity comment = seedComment(
                ticket, "student@campus.test", "Please prioritise this.", Instant.parse("2026-04-20T08:00:00Z"));

        mockMvc.perform(delete("/api/tickets/{id}/comments/{commentId}", ticket.getId(), comment.getId())
                        .with(jwtFor("student@campus.test")))
                .andExpect(status().isNoContent());

        assertThat(ticketCommentRepository.findById(comment.getId())).isEmpty();

        mockMvc.perform(get("/api/tickets/{id}/comments", ticket.getId())
                        .with(jwtFor("student@campus.test")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$._links.self.href").exists())
                .andExpect(jsonPath("$._embedded").doesNotExist());
    }

    @Test
    void reporterCannotDeleteOwnOlderComment() throws Exception {
        TicketEntity ticket = seedTicket("student@campus.test", TicketStatus.OPEN);
        TicketCommentEntity olderComment = seedComment(
                ticket, "student@campus.test", "First note.", Instant.parse("2026-04-20T08:00:00Z"));
        seedComment(ticket, "student@campus.test", "Newer note.", Instant.parse("2026-04-20T09:00:00Z"));

        mockMvc.perform(delete("/api/tickets/{id}/comments/{commentId}", ticket.getId(), olderComment.getId())
                        .with(jwtFor("student@campus.test")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Only the latest ticket comment can be deleted."));

        assertThat(ticketCommentRepository.findById(olderComment.getId())).isPresent();
    }

    @Test
    void assignedTicketManagerCannotDeleteReporterComment() throws Exception {
        TicketEntity ticket = assignTicketTo("ticketmgr@campus.test",
                seedTicket("student@campus.test", TicketStatus.IN_PROGRESS));
        TicketCommentEntity comment = seedComment(
                ticket, "student@campus.test", "Student update.", Instant.parse("2026-04-20T08:00:00Z"));

        mockMvc.perform(delete("/api/tickets/{id}/comments/{commentId}", ticket.getId(), comment.getId())
                        .with(jwtFor("ticketmgr@campus.test")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("You can only delete your own comments."));

        assertThat(ticketCommentRepository.findById(comment.getId())).isPresent();
    }

    @Test
    void assignedTicketManagerCanDeleteOwnLatestComment() throws Exception {
        TicketEntity ticket = assignTicketTo("ticketmgr@campus.test",
                seedTicket("student@campus.test", TicketStatus.IN_PROGRESS));
        seedComment(ticket, "student@campus.test", "Student update.", Instant.parse("2026-04-20T08:00:00Z"));
        TicketCommentEntity managerComment = seedComment(
                ticket, "ticketmgr@campus.test", "Manager update.", Instant.parse("2026-04-20T09:00:00Z"));

        mockMvc.perform(delete("/api/tickets/{id}/comments/{commentId}", ticket.getId(), managerComment.getId())
                        .with(jwtFor("ticketmgr@campus.test")))
                .andExpect(status().isNoContent());

        assertThat(ticketCommentRepository.findById(managerComment.getId())).isEmpty();
    }

    @Test
    void adminCanDeleteAnyonesLatestComment() throws Exception {
        TicketEntity ticket = seedTicket("student@campus.test", TicketStatus.RESOLVED);
        TicketCommentEntity comment = seedComment(
                ticket, "student@campus.test", "Final student note.", Instant.parse("2026-04-20T08:00:00Z"));

        mockMvc.perform(delete("/api/tickets/{id}/comments/{commentId}", ticket.getId(), comment.getId())
                        .with(jwtFor("admin@campus.test")))
                .andExpect(status().isNoContent());

        assertThat(ticketCommentRepository.findById(comment.getId())).isEmpty();
    }

    @Test
    void adminCannotDeleteOlderComment() throws Exception {
        TicketEntity ticket = seedTicket("student@campus.test", TicketStatus.IN_PROGRESS);
        TicketCommentEntity olderComment = seedComment(
                ticket, "student@campus.test", "Student note.", Instant.parse("2026-04-20T08:00:00Z"));
        seedComment(ticket, "admin@campus.test", "Admin note.", Instant.parse("2026-04-20T09:00:00Z"));

        mockMvc.perform(delete("/api/tickets/{id}/comments/{commentId}", ticket.getId(), olderComment.getId())
                        .with(jwtFor("admin@campus.test")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Only the latest ticket comment can be deleted."));

        assertThat(ticketCommentRepository.findById(olderComment.getId())).isPresent();
    }

    @Test
    void deleteCommentWithMismatchedTicketReturnsNotFound() throws Exception {
        TicketEntity ticket = seedTicket("student@campus.test", TicketStatus.OPEN);
        TicketEntity otherTicket = seedTicket("student@campus.test", TicketStatus.OPEN);
        TicketCommentEntity comment = seedComment(
                ticket, "student@campus.test", "Ticket comment.", Instant.parse("2026-04-20T08:00:00Z"));

        mockMvc.perform(delete("/api/tickets/{id}/comments/{commentId}", otherTicket.getId(), comment.getId())
                        .with(jwtFor("student@campus.test")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Ticket comment not found."));
    }

    @Test
    void userCannotDeleteCommentOnInaccessibleTicket() throws Exception {
        seedStudent("other4@campus.test");
        TicketEntity ticket = seedTicket("other4@campus.test", TicketStatus.OPEN);
        TicketCommentEntity comment = seedComment(
                ticket, "other4@campus.test", "Private note.", Instant.parse("2026-04-20T08:00:00Z"));

        mockMvc.perform(delete("/api/tickets/{id}/comments/{commentId}", ticket.getId(), comment.getId())
                        .with(jwtFor("student@campus.test")))
                .andExpect(status().isForbidden());

        assertThat(ticketCommentRepository.findById(comment.getId())).isPresent();
    }

    @Test
    void reporterCanAddAndListAttachmentMetadata() throws Exception {
        TicketEntity ticket = seedTicket("student@campus.test", TicketStatus.OPEN);
        AddTicketAttachmentRequest request = new AddTicketAttachmentRequest(
                "broken-light.jpg", "https://files.campus.test/broken-light.jpg", "image/jpeg");

        mockMvc.perform(post("/api/tickets/{id}/attachments", ticket.getId())
                        .with(jwtFor("student@campus.test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.ticketId").value(ticket.getId().toString()))
                .andExpect(jsonPath("$.fileName").value("broken-light.jpg"))
                .andExpect(jsonPath("$.fileUrl").value("https://files.campus.test/broken-light.jpg"))
                .andExpect(jsonPath("$.fileType").value("image/jpeg"))
                .andExpect(jsonPath("$.uploadedAt").isNotEmpty())
                .andExpect(jsonPath("$._links.self.href").exists());

        mockMvc.perform(get("/api/tickets/{id}/attachments", ticket.getId())
                        .with(jwtFor("student@campus.test")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$._embedded.attachments.length()").value(1))
                .andExpect(jsonPath("$._embedded.attachments[0].fileName").value("broken-light.jpg"));
    }

    @Test
    void getAttachmentReturnsHalResource() throws Exception {
        TicketEntity ticket = seedTicket("student@campus.test", TicketStatus.OPEN);
        TicketAttachmentEntity attachment = seedAttachment(ticket);

        mockMvc.perform(get("/api/tickets/{id}/attachments/{attachmentId}", ticket.getId(), attachment.getId())
                        .with(jwtFor("student@campus.test")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fileName").value("existing-file.pdf"))
                .andExpect(jsonPath("$._links.self.href").exists())
                .andExpect(jsonPath("$._links.ticket.href").exists())
                .andExpect(jsonPath("$._links.attachments.href").exists());
    }

    @Test
    void reporterCanUploadAttachmentFileForOwnTicket() throws Exception {
        TicketEntity ticket = seedTicket("student@campus.test", TicketStatus.OPEN);
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "broken-light.jpg",
                "image/jpeg",
                "fake image bytes".getBytes());

        mockMvc.perform(multipart("/api/tickets/{id}/attachments", ticket.getId())
                        .file(file)
                        .with(jwtFor("student@campus.test")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.ticketId").value(ticket.getId().toString()))
                .andExpect(jsonPath("$.fileName").value("broken-light.jpg"))
                .andExpect(jsonPath("$.fileUrl").value(
                        "https://storage.campus.test/ticket-attachments/tickets/"
                                + ticket.getId() + "/broken-light.jpg"))
                .andExpect(jsonPath("$.fileType").value("image/jpeg"))
                .andExpect(jsonPath("$.uploadedAt").isNotEmpty())
                .andExpect(jsonPath("$._links.self.href").exists());

        assertThat(ticketAttachmentStorageClient.uploads()).hasSize(1);

        mockMvc.perform(get("/api/tickets/{id}/attachments", ticket.getId())
                        .with(jwtFor("student@campus.test")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$._embedded.attachments.length()").value(1))
                .andExpect(jsonPath("$._embedded.attachments[0].fileName").value("broken-light.jpg"));
    }

    @Test
    void ticketManagerCanAddAndListAttachmentMetadataForAssignedTicket() throws Exception {
        TicketEntity ticket = assignTicketTo("ticketmgr@campus.test",
                seedTicket("student@campus.test", TicketStatus.OPEN));
        AddTicketAttachmentRequest request = new AddTicketAttachmentRequest(
                "network-log.txt", "https://files.campus.test/network-log.txt", "text/plain");

        mockMvc.perform(post("/api/tickets/{id}/attachments", ticket.getId())
                        .with(jwtFor("ticketmgr@campus.test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.fileName").value("network-log.txt"))
                .andExpect(jsonPath("$._links.self.href").exists());

        mockMvc.perform(get("/api/tickets/{id}/attachments", ticket.getId())
                        .with(jwtFor("ticketmgr@campus.test")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$._embedded.attachments.length()").value(1))
                .andExpect(jsonPath("$._embedded.attachments[0].fileType").value("text/plain"));
    }

    @Test
    void reporterCannotManageAttachmentsOnAnotherUsersTicket() throws Exception {
        seedStudent("other3@campus.test");
        TicketEntity ticket = seedTicket("other3@campus.test", TicketStatus.OPEN);
        TicketAttachmentEntity attachment = seedAttachment(ticket);
        AddTicketAttachmentRequest request = new AddTicketAttachmentRequest(
                "new-file.pdf", "https://files.campus.test/new-file.pdf", "application/pdf");
        MockMultipartFile file = new MockMultipartFile("file", "new-file.pdf", "application/pdf", "pdf".getBytes());

        mockMvc.perform(get("/api/tickets/{id}/attachments", ticket.getId())
                        .with(jwtFor("student@campus.test")))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/tickets/{id}/attachments", ticket.getId())
                        .with(jwtFor("student@campus.test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());

        mockMvc.perform(multipart("/api/tickets/{id}/attachments", ticket.getId())
                        .file(file)
                        .with(jwtFor("student@campus.test")))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/api/tickets/{id}/attachments/{attachmentId}", ticket.getId(), attachment.getId())
                        .with(jwtFor("student@campus.test")))
                .andExpect(status().isForbidden());
    }

    @Test
    void deleteAttachmentRemovesMetadata() throws Exception {
        TicketEntity ticket = seedTicket("student@campus.test", TicketStatus.OPEN);
        TicketAttachmentEntity attachment = seedAttachment(ticket);

        mockMvc.perform(delete("/api/tickets/{id}/attachments/{attachmentId}", ticket.getId(), attachment.getId())
                        .with(jwtFor("student@campus.test")))
                .andExpect(status().isNoContent());

        assertThat(ticketAttachmentStorageClient.deletedUrls()).contains("https://files.campus.test/existing-file.pdf");
        assertThat(ticketAttachmentRepository.findById(attachment.getId())).isEmpty();

        mockMvc.perform(get("/api/tickets/{id}/attachments", ticket.getId())
                        .with(jwtFor("student@campus.test")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$._links.self.href").exists())
                .andExpect(jsonPath("$._embedded").doesNotExist());
    }

    @Test
    void deleteAttachmentWithMismatchedTicketReturnsNotFound() throws Exception {
        TicketEntity ticket = seedTicket("student@campus.test", TicketStatus.OPEN);
        TicketEntity otherTicket = seedTicket("student@campus.test", TicketStatus.OPEN);
        TicketAttachmentEntity attachment = seedAttachment(ticket);

        mockMvc.perform(delete("/api/tickets/{id}/attachments/{attachmentId}", otherTicket.getId(), attachment.getId())
                        .with(jwtFor("student@campus.test")))
                .andExpect(status().isNotFound());
    }

    @Test
    void missingAttachmentFieldsReturnBadRequest() throws Exception {
        TicketEntity ticket = seedTicket("student@campus.test", TicketStatus.OPEN);

        mockMvc.perform(post("/api/tickets/{id}/attachments", ticket.getId())
                        .with(jwtFor("student@campus.test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void emptyAttachmentUploadReturnsBadRequest() throws Exception {
        TicketEntity ticket = seedTicket("student@campus.test", TicketStatus.OPEN);
        MockMultipartFile file = new MockMultipartFile("file", "empty.pdf", "application/pdf", new byte[0]);

        mockMvc.perform(multipart("/api/tickets/{id}/attachments", ticket.getId())
                        .file(file)
                        .with(jwtFor("student@campus.test")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Attachment file is required."));
    }

    @Test
    void statusHistoryRecordsEachTransition() throws Exception {
        TicketEntity ticket = assignTicketTo("ticketmgr@campus.test",
                seedTicket("student@campus.test", TicketStatus.OPEN));

        TicketStatusUpdateRequest toInProgress = new TicketStatusUpdateRequest(
                TicketStatus.IN_PROGRESS, "Assigned to team.", null, null, null);

        mockMvc.perform(put("/api/tickets/{id}/status", ticket.getId())
                        .with(jwtFor("ticketmgr@campus.test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(toInProgress)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/tickets/{id}/history", ticket.getId())
                        .with(jwtFor("student@campus.test")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$._embedded.statusHistory.length()").value(2))
                .andExpect(jsonPath("$._embedded.statusHistory[0].newStatus").value("OPEN"))
                .andExpect(jsonPath("$._embedded.statusHistory[0].oldStatus").isEmpty())
                .andExpect(jsonPath("$._embedded.statusHistory[1].oldStatus").value("OPEN"))
                .andExpect(jsonPath("$._embedded.statusHistory[1].newStatus").value("IN_PROGRESS"));
    }

    @Test
    void getStatusHistoryEntryReturnsHalResource() throws Exception {
        TicketEntity ticket = seedTicket("student@campus.test", TicketStatus.OPEN);
        var history = ticketStatusHistoryRepository.findByTicketIdOrderByChangedAtAsc(ticket.getId()).get(0);

        mockMvc.perform(get("/api/tickets/{id}/history/{historyId}", ticket.getId(), history.getId())
                        .with(jwtFor("student@campus.test")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.newStatus").value("OPEN"))
                .andExpect(jsonPath("$._links.self.href").exists())
                .andExpect(jsonPath("$._links.ticket.href").exists())
                .andExpect(jsonPath("$._links.history.href").exists());
    }

    @Test
    void closedTicketRejectsFurtherStatusUpdates() throws Exception {
        TicketEntity ticket = assignTicketTo("ticketmgr@campus.test",
                seedTicket("student@campus.test", TicketStatus.CLOSED));

        TicketStatusUpdateRequest request = new TicketStatusUpdateRequest(
                TicketStatus.IN_PROGRESS, null, null, null, null);

        mockMvc.perform(put("/api/tickets/{id}/status", ticket.getId())
                        .with(jwtFor("ticketmgr@campus.test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Closed tickets cannot be updated."));
    }

    @Test
    void unauthenticatedRequestIsRejected() throws Exception {
        mockMvc.perform(get("/api/tickets"))
                .andExpect(status().isUnauthorized());
    }

    private void assertInvalidAssignment(TicketEntity ticket, UserEntity assignee) throws Exception {
        AssignTicketRequest request = new AssignTicketRequest(assignee.getId());

        mockMvc.perform(put("/api/tickets/{id}/assign", ticket.getId())
                        .with(jwtFor("admin@campus.test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        "Tickets can only be assigned to active admins or ticket managers."));
    }

    private void assertAdminCannotUpdateOtherUsersTicket(TicketStatusUpdateRequest request) throws Exception {
        TicketEntity ticket = assignTicketTo("ticketmgr@campus.test",
                seedTicket("student@campus.test", TicketStatus.IN_PROGRESS));

        mockMvc.perform(put("/api/tickets/{id}/status", ticket.getId())
                        .with(jwtFor("admin@campus.test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(
                        "Admins can only update tickets assigned to themselves."));

        TicketEntity persisted = ticketRepository.findById(ticket.getId()).orElseThrow();
        assertThat(persisted.getStatus()).isEqualTo(TicketStatus.IN_PROGRESS);
        assertThat(persisted.getResolutionNotes()).isNull();
        assertThat(persisted.getRejectionReason()).isNull();
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
        user.setStudentProfile(student);

        return userRepository.save(user);
    }

    private UserEntity seedTicketManager(String email) {
        return seedManager(email, ManagerRole.TICKET_MANAGER, AccountStatus.ACTIVE);
    }

    private UserEntity seedManager(String email, ManagerRole role, AccountStatus status) {
        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());
        if (status == AccountStatus.ACTIVE || status == AccountStatus.SUSPENDED) {
            user.setAuthUserId(authUserIdFor(email));
        }
        user.setEmail(email);
        user.setUserType(UserType.MANAGER);
        user.setAccountStatus(status);
        user.setInvitedAt(Instant.now());
        if (status == AccountStatus.ACTIVE || status == AccountStatus.SUSPENDED) {
            user.setActivatedAt(Instant.now());
        }

        ManagerEntity manager = new ManagerEntity();
        manager.setUser(user);
        manager.setFirstName("Ticket");
        manager.setLastName("Manager");
        manager.setEmployeeNumber("MGR-" + UUID.randomUUID().toString().substring(0, 8));
        manager.setManagerRole(role);
        user.setManagerProfile(manager);

        return userRepository.save(user);
    }

    private TicketEntity seedTicket(String reporterEmail, TicketStatus status) {
        UserEntity reporter = userRepository.findByEmailIgnoreCase(reporterEmail).orElseThrow();

        long seq = ticketRepository.nextTicketCodeSequence();
        TicketEntity ticket = new TicketEntity();
        ticket.setId(UUID.randomUUID());
        ticket.setTicketCode(String.format("TCK-%04d", seq));
        ticket.setTitle("Seeded Ticket");
        ticket.setDescription("Seeded for testing.");
        ticket.setCategory(TicketCategory.ELECTRICAL);
        ticket.setPriority(TicketPriority.MEDIUM);
        ticket.setStatus(status);
        ticket.setReportedBy(reporter);
        TicketEntity savedTicket = ticketRepository.save(ticket);

        TicketStatusHistoryEntity history = new TicketStatusHistoryEntity();
        history.setId(UUID.randomUUID());
        history.setTicket(savedTicket);
        history.setOldStatus(null);
        history.setNewStatus(TicketStatus.OPEN);
        history.setChangedBy(reporter);
        history.setChangedAt(Instant.now());
        ticketStatusHistoryRepository.save(history);

        return savedTicket;
    }

    private ResourceEntity seedResource(String name, Location location) {
        ResourceEntity resource = new ResourceEntity();
        resource.setId(UUID.randomUUID());
        resource.setCode("TICKET-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        resource.setName(name);
        resource.setCategory(com.university.smartcampus.AppEnums.ResourceCategory.GENERAL_UTILITY);
        resource.setDescription(name + " description");
        resource.setLocationEntity(location);
        resource.setLocation(location == null ? null : location.getLocationName());
        resource.setStatus(com.university.smartcampus.AppEnums.ResourceStatus.ACTIVE);
        resource.setBookable(false);
        resource.setMovable(true);
        return resourceRepository.save(resource);
    }

    private Location seedLocation(String locationName) {
        Location location = new Location();
        location.setLocationName(locationName + " " + UUID.randomUUID().toString().substring(0, 8));
        location.setLocationType("OTHER");
        return locationRepository.save(location);
    }

    private TicketEntity setTicketCreatedAt(TicketEntity ticket, Instant createdAt) {
        ticket.setCreatedAt(createdAt);
        TicketEntity saved = ticketRepository.save(ticket);
        ticketStatusHistoryRepository.findByTicketIdOrderByChangedAtAsc(saved.getId()).stream()
                .filter(history -> history.getOldStatus() == null && history.getNewStatus() == TicketStatus.OPEN)
                .findFirst()
                .ifPresent(history -> {
                    history.setChangedAt(createdAt);
                    ticketStatusHistoryRepository.save(history);
                });
        return saved;
    }

    private TicketStatusHistoryEntity seedStatusHistory(TicketEntity ticket, TicketStatus oldStatus,
            TicketStatus newStatus, String changedByEmail, Instant changedAt, String note) {
        UserEntity changedBy = userRepository.findByEmailIgnoreCase(changedByEmail).orElseThrow();
        TicketStatusHistoryEntity history = new TicketStatusHistoryEntity();
        history.setId(UUID.randomUUID());
        history.setTicket(ticket);
        history.setOldStatus(oldStatus);
        history.setNewStatus(newStatus);
        history.setChangedBy(changedBy);
        history.setChangedAt(changedAt);
        history.setNote(note);
        return ticketStatusHistoryRepository.save(history);
    }

    private TicketAssignmentHistoryEntity seedAssignmentHistory(TicketEntity ticket, String oldAssigneeEmail,
            String newAssigneeEmail, String changedByEmail, Instant changedAt) {
        TicketAssignmentHistoryEntity history = new TicketAssignmentHistoryEntity();
        history.setId(UUID.randomUUID());
        history.setTicket(ticket);
        history.setOldAssignee(oldAssigneeEmail == null
                ? null
                : userRepository.findByEmailIgnoreCase(oldAssigneeEmail).orElseThrow());
        history.setNewAssignee(newAssigneeEmail == null
                ? null
                : userRepository.findByEmailIgnoreCase(newAssigneeEmail).orElseThrow());
        history.setChangedBy(userRepository.findByEmailIgnoreCase(changedByEmail).orElseThrow());
        history.setChangedAt(changedAt);
        return ticketAssignmentHistoryRepository.save(history);
    }

    private TicketEntity assignTicketTo(String assigneeEmail, TicketEntity ticket) {
        UserEntity assignee = userRepository.findByEmailIgnoreCase(assigneeEmail).orElseThrow();
        ticket.setAssignedTo(assignee);
        return ticketRepository.save(ticket);
    }

    private TicketAttachmentEntity seedAttachment(TicketEntity ticket) {
        return seedAttachment(ticket, "https://files.campus.test/existing-file.pdf");
    }

    private TicketAttachmentEntity seedAttachment(TicketEntity ticket, String fileUrl) {
        TicketAttachmentEntity attachment = new TicketAttachmentEntity();
        attachment.setId(UUID.randomUUID());
        attachment.setTicket(ticket);
        attachment.setFileName("existing-file.pdf");
        attachment.setFileUrl(fileUrl);
        attachment.setFileType("application/pdf");
        attachment.setUploadedAt(Instant.now());
        return ticketAttachmentRepository.save(attachment);
    }

    private TicketCommentEntity seedComment(TicketEntity ticket, String userEmail, String text, Instant createdAt) {
        UserEntity user = userRepository.findByEmailIgnoreCase(userEmail).orElseThrow();
        TicketCommentEntity comment = new TicketCommentEntity();
        comment.setId(UUID.randomUUID());
        comment.setTicket(ticket);
        comment.setUser(user);
        comment.setCommentText(text);
        comment.setEdited(false);
        comment.setCreatedAt(createdAt);
        return ticketCommentRepository.save(comment);
    }
}
