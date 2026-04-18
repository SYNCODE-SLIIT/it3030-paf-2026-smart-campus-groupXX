package com.university.smartcampus;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.webAppContextSetup;

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
import com.university.smartcampus.ticket.dto.TicketDtos.AddCommentRequest;
import com.university.smartcampus.ticket.dto.TicketDtos.AddTicketAttachmentRequest;
import com.university.smartcampus.ticket.dto.TicketDtos.AssignTicketRequest;
import com.university.smartcampus.ticket.dto.TicketDtos.CreateTicketRequest;
import com.university.smartcampus.ticket.dto.TicketDtos.TicketStatusUpdateRequest;
import com.university.smartcampus.ticket.entity.TicketAttachmentEntity;
import com.university.smartcampus.ticket.entity.TicketEntity;
import com.university.smartcampus.ticket.repository.TicketAttachmentRepository;
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
    private TicketRepository ticketRepository;

    @Autowired
    private TicketAttachmentRepository ticketAttachmentRepository;

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
                .andExpect(jsonPath("$.reportedByEmail").value("student@campus.test"));
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
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].reportedByEmail").value("student@campus.test"));
    }

    @Test
    void ticketManagerListsOnlyAssignedTickets() throws Exception {
        seedStudent("student2@campus.test");
        TicketEntity assigned = assignTicketTo("ticketmgr@campus.test",
                seedTicket("student@campus.test", TicketStatus.OPEN));
        seedTicket("student2@campus.test", TicketStatus.OPEN);

        mockMvc.perform(get("/api/tickets").with(jwtFor("ticketmgr@campus.test")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(assigned.getId().toString()));
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
                .andExpect(jsonPath("$.id").value(ticket.getId().toString()));
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
    void statusUpdateCannotAssignTicketToInvalidUser() throws Exception {
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
                        "Tickets can only be assigned to active admins or ticket managers."));

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
                seedTicket("student@campus.test", TicketStatus.OPEN));

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
                seedTicket("student@campus.test", TicketStatus.OPEN));

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
                .andExpect(jsonPath("$.isEdited").value(false));
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
                .andExpect(jsonPath("$.userEmail").value("ticketmgr@campus.test"));
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
                .andExpect(jsonPath("$.uploadedAt").isNotEmpty());

        mockMvc.perform(get("/api/tickets/{id}/attachments", ticket.getId())
                        .with(jwtFor("student@campus.test")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].fileName").value("broken-light.jpg"));
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
                .andExpect(jsonPath("$.uploadedAt").isNotEmpty());

        assertThat(ticketAttachmentStorageClient.uploads()).hasSize(1);

        mockMvc.perform(get("/api/tickets/{id}/attachments", ticket.getId())
                        .with(jwtFor("student@campus.test")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].fileName").value("broken-light.jpg"));
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
                .andExpect(jsonPath("$.fileName").value("network-log.txt"));

        mockMvc.perform(get("/api/tickets/{id}/attachments", ticket.getId())
                        .with(jwtFor("ticketmgr@campus.test")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].fileType").value("text/plain"));
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
                .andExpect(jsonPath("$.length()").value(0));
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
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].newStatus").value("OPEN"))
                .andExpect(jsonPath("$[0].oldStatus").isEmpty())
                .andExpect(jsonPath("$[1].oldStatus").value("OPEN"))
                .andExpect(jsonPath("$[1].newStatus").value("IN_PROGRESS"));
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

    private void seedAdmin(String email) {
        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());
        user.setEmail(email);
        user.setUserType(UserType.ADMIN);
        user.setAccountStatus(AccountStatus.ACTIVE);
        user.setInvitedAt(Instant.now());
        user.setActivatedAt(Instant.now());

        AdminEntity admin = new AdminEntity();
        admin.setUser(user);
        admin.setFullName("Admin User");
        admin.setEmployeeNumber("ADM-001");
        user.setAdminProfile(admin);

        userRepository.save(user);
    }

    private UserEntity seedFaculty(String email) {
        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());
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

        com.university.smartcampus.ticket.entity.TicketStatusHistoryEntity history =
                new com.university.smartcampus.ticket.entity.TicketStatusHistoryEntity();
        history.setId(UUID.randomUUID());
        history.setTicket(savedTicket);
        history.setOldStatus(null);
        history.setNewStatus(TicketStatus.OPEN);
        history.setChangedBy(reporter);
        history.setChangedAt(Instant.now());
        ticketStatusHistoryRepository.save(history);

        return savedTicket;
    }

    private TicketEntity assignTicketTo(String assigneeEmail, TicketEntity ticket) {
        UserEntity assignee = userRepository.findByEmailIgnoreCase(assigneeEmail).orElseThrow();
        ticket.setAssignedTo(assignee);
        return ticketRepository.save(ticket);
    }

    private TicketAttachmentEntity seedAttachment(TicketEntity ticket) {
        TicketAttachmentEntity attachment = new TicketAttachmentEntity();
        attachment.setId(UUID.randomUUID());
        attachment.setTicket(ticket);
        attachment.setFileName("existing-file.pdf");
        attachment.setFileUrl("https://files.campus.test/existing-file.pdf");
        attachment.setFileType("application/pdf");
        attachment.setUploadedAt(Instant.now());
        return ticketAttachmentRepository.save(attachment);
    }
}
