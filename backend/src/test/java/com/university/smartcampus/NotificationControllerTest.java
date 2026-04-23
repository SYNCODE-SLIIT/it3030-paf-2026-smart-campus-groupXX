package com.university.smartcampus;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.webAppContextSetup;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.context.WebApplicationContext;

import com.university.smartcampus.common.enums.AppEnums.AccountStatus;
import com.university.smartcampus.common.enums.AppEnums.UserType;
import com.university.smartcampus.notification.NotificationDtos.UpdateNotificationPreferenceCategoryRequest;
import com.university.smartcampus.notification.NotificationDtos.UpdateNotificationPreferencesRequest;
import com.university.smartcampus.notification.NotificationEnums.NotificationDomain;
import com.university.smartcampus.user.entity.StudentEntity;
import com.university.smartcampus.user.entity.UserEntity;
import com.university.smartcampus.user.repository.UserRepository;

import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@Import(TestAuthProviderConfiguration.class)
class NotificationControllerTest extends AbstractPostgresIntegrationTest {

    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private WebApplicationContext context;

    @BeforeEach
    void setUp() {
        mockMvc = webAppContextSetup(context).apply(springSecurity()).build();
        userRepository.deleteAll();
    }

    @Test
    void userCanGetCategoryNotificationPreferences() throws Exception {
        seedActiveStudent("preferences.controller@campus.test");

        mockMvc.perform(get("/api/notifications/preferences")
                .with(jwtFor("preferences.controller@campus.test")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.categories.length()").value(4))
            .andExpect(jsonPath("$.categories[0].domain").value("TICKET"))
            .andExpect(jsonPath("$.categories[0].inAppEnabled").value(true))
            .andExpect(jsonPath("$.categories[0].emailEnabled").value(true))
            .andExpect(jsonPath("$.categories[3].domain").value("SYSTEM"));
    }

    @Test
    void userCanUpdateCategoryNotificationPreferences() throws Exception {
        seedActiveStudent("preferences.update@campus.test");
        UpdateNotificationPreferencesRequest request = new UpdateNotificationPreferencesRequest(List.of(
            new UpdateNotificationPreferenceCategoryRequest(NotificationDomain.TICKET, false, false),
            new UpdateNotificationPreferenceCategoryRequest(NotificationDomain.BOOKING, true, false),
            new UpdateNotificationPreferenceCategoryRequest(NotificationDomain.CATALOG, false, true),
            new UpdateNotificationPreferenceCategoryRequest(NotificationDomain.SYSTEM, true, true)
        ));

        mockMvc.perform(patch("/api/notifications/preferences")
                .with(jwtFor("preferences.update@campus.test"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.categories[0].domain").value("TICKET"))
            .andExpect(jsonPath("$.categories[0].inAppEnabled").value(false))
            .andExpect(jsonPath("$.categories[0].emailEnabled").value(false))
            .andExpect(jsonPath("$.categories[1].domain").value("BOOKING"))
            .andExpect(jsonPath("$.categories[1].emailEnabled").value(false))
            .andExpect(jsonPath("$.categories[2].domain").value("CATALOG"))
            .andExpect(jsonPath("$.categories[2].inAppEnabled").value(false))
            .andExpect(jsonPath("$.categories[3].domain").value("SYSTEM"))
            .andExpect(jsonPath("$.categories[3].inAppEnabled").value(true))
            .andExpect(jsonPath("$.categories[3].emailEnabled").value(true));
    }

    private UserEntity seedActiveStudent(String email) {
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
}
