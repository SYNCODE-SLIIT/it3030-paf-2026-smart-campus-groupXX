package com.university.smartcampus;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.webAppContextSetup;

import java.time.Instant;
import java.time.LocalTime;
import java.util.Set;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.context.WebApplicationContext;

import com.university.smartcampus.AppEnums.AccountStatus;
import com.university.smartcampus.AppEnums.ManagerRole;
import com.university.smartcampus.AppEnums.ResourceCategory;
import com.university.smartcampus.AppEnums.ResourceStatus;
import com.university.smartcampus.AppEnums.UserType;

import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@Import(TestAuthProviderConfiguration.class)
class ResourceControllerTest extends AbstractPostgresIntegrationTest {

    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private WebApplicationContext context;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ResourceRepository resourceRepository;

    @BeforeEach
    void setUp() {
        mockMvc = webAppContextSetup(context).apply(springSecurity()).build();
        resourceRepository.deleteAll();
        userRepository.deleteAll();
        seedAdmin("admin@campus.test");
        seedManager("catalog.manager@campus.test", Set.of(ManagerRole.CATALOG_MANAGER));
        seedManager("booking.manager@campus.test", Set.of(ManagerRole.BOOKING_MANAGER));
        seedStudent("student@campus.test");
    }

    @Test
    void authenticatedUserCanListResourcesAndFilterThem() throws Exception {
        ResourceEntity library = seedResource("LIB-01", "Main Library", ResourceCategory.SPACES, ResourceStatus.ACTIVE, "Library");
        seedResource("VAN-01", "Campus Van", ResourceCategory.TRANSPORT_AND_LOGISTICS, ResourceStatus.MAINTENANCE, "Transport Yard");

        mockMvc.perform(get("/api/resources")
                .with(jwtFor("student@campus.test"))
                .param("search", "library")
                .param("category", "SPACES")
                .param("status", "ACTIVE")
                .param("location", "lib"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].id").value(library.getId().toString()))
            .andExpect(jsonPath("$[0].code").value("LIB-01"))
            .andExpect(jsonPath("$[0].category").value("SPACES"));
    }

    @Test
    void catalogManagerCanCreateAndUpdateResource() throws Exception {
        mockMvc.perform(post("/api/resources")
                .with(jwtFor("catalog.manager@campus.test"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "code": "mic-01",
                      "name": "Wireless Microphone",
                      "category": "EVENT_AND_DECORATION",
                      "subcategory": "Audio",
                      "description": "Main hall wireless microphone",
                      "location": "Auditorium",
                      "capacity": 1,
                      "quantity": 4,
                      "status": "ACTIVE",
                      "bookable": true,
                      "movable": true,
                      "availableFrom": "09:00:00",
                      "availableTo": "18:00:00"
                    }
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.code").value("MIC-01"))
            .andExpect(jsonPath("$.bookable").value(true));

        ResourceEntity persisted = resourceRepository.findAll().stream().findFirst().orElseThrow();

        mockMvc.perform(patch("/api/resources/{id}", persisted.getId())
                .with(jwtFor("catalog.manager@campus.test"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "status": "OUT_OF_SERVICE",
                      "location": "Media Room"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("OUT_OF_SERVICE"))
            .andExpect(jsonPath("$.location").value("Media Room"));
    }

    @Test
    void managerWithoutCatalogRoleCannotCreateResource() throws Exception {
        mockMvc.perform(post("/api/resources")
                .with(jwtFor("booking.manager@campus.test"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "code": "tool-01",
                      "name": "Maintenance Tool Kit",
                      "category": "MAINTENANCE_AND_CLEANING",
                      "status": "ACTIVE",
                      "bookable": false,
                      "movable": true
                    }
                    """))
            .andExpect(status().isForbidden());
    }

    @Test
    void adminCanSoftDeleteResource() throws Exception {
        ResourceEntity resource = seedResource("GEN-01", "Backup Generator", ResourceCategory.GENERAL_UTILITY, ResourceStatus.ACTIVE, "Utility Yard");

        mockMvc.perform(delete("/api/resources/{id}", resource.getId())
                .with(jwtFor("admin@campus.test")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value("Resource removed."));

        assertThat(resourceRepository.findById(resource.getId())).isPresent();
        assertThat(resourceRepository.findById(resource.getId()).orElseThrow().getStatus()).isEqualTo(ResourceStatus.INACTIVE);
    }

    @Test
    void getResourceByIdRequiresAuthentication() throws Exception {
        ResourceEntity resource = seedResource("BUS-01", "Campus Bus", ResourceCategory.TRANSPORT_AND_LOGISTICS, ResourceStatus.ACTIVE, "Main Gate");

        mockMvc.perform(get("/api/resources/{id}", resource.getId())
                .with(jwt().jwt(jwt -> jwt.subject(UUID.randomUUID().toString()).claim("email", "student@campus.test"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(resource.getId().toString()))
            .andExpect(jsonPath("$.code").value("BUS-01"));
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
        admin.setFirstName("Admin");
        admin.setLastName("User");
        admin.setEmployeeNumber("ADM-001");
        admin.setDepartment("Operations");
        admin.setJobTitle("Administrator");
        user.setAdminProfile(admin);

        userRepository.save(user);
    }

    private void seedStudent(String email) {
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

        userRepository.save(user);
    }

    private void seedManager(String email, Set<ManagerRole> roles) {
        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());
        user.setEmail(email);
        user.setUserType(UserType.MANAGER);
        user.setAccountStatus(AccountStatus.ACTIVE);
        user.setInvitedAt(Instant.now());
        user.setActivatedAt(Instant.now());

        ManagerEntity manager = new ManagerEntity();
        manager.setUser(user);
        manager.setFirstName("Manager");
        manager.setLastName("User");
        manager.setEmployeeNumber("MGR-001");
        manager.setDepartment("Facilities");
        manager.setJobTitle("Manager");
        manager.setManagerRoles(roles);
        user.setManagerProfile(manager);

        userRepository.save(user);
    }

    private ResourceEntity seedResource(
        String code,
        String name,
        ResourceCategory category,
        ResourceStatus status,
        String location
    ) {
        ResourceEntity resource = new ResourceEntity();
        resource.setId(UUID.randomUUID());
        resource.setCode(code);
        resource.setName(name);
        resource.setCategory(category);
        resource.setSubcategory("Seeded");
        resource.setDescription(name + " description");
        resource.setLocation(location);
        resource.setCapacity(20);
        resource.setQuantity(2);
        resource.setStatus(status);
        resource.setBookable(true);
        resource.setMovable(true);
        resource.setAvailableFrom(LocalTime.of(8, 0));
        resource.setAvailableTo(LocalTime.of(17, 0));
        return resourceRepository.save(resource);
    }
}
