package com.university.smartcampus.resource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalTime;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.university.smartcampus.AppEnums.ResourceCategory;
import com.university.smartcampus.AppEnums.ResourceStatus;
import com.university.smartcampus.booking.BookingModificationRepository;
import com.university.smartcampus.booking.BookingRepository;
import com.university.smartcampus.booking.RecurringBookingRepository;
import com.university.smartcampus.common.exception.BadRequestException;
import com.university.smartcampus.notification.NotificationEventLinkRepository;
import com.university.smartcampus.notification.NotificationService;
import com.university.smartcampus.resource.ResourceDtos.AvailabilityWindowRequest;
import com.university.smartcampus.resource.ResourceDtos.CreateResourceRequest;
import com.university.smartcampus.resource.ResourceDtos.ResourceResponse;
import com.university.smartcampus.resource.ResourceDtos.UpdateResourceRequest;
import com.university.smartcampus.ticket.repository.TicketRepository;

@ExtendWith(MockitoExtension.class)
class ResourceServiceTypeRulesTest {

    @Mock
    private ResourceRepository resourceRepository;

    @Mock
    private ResourceTypeRepository resourceTypeRepository;

    @Mock
    private LocationRepository locationRepository;

    @Mock
    private ResourceFeatureRepository resourceFeatureRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private BookingModificationRepository bookingModificationRepository;

    @Mock
    private RecurringBookingRepository recurringBookingRepository;

    @Mock
    private NotificationEventLinkRepository notificationEventLinkRepository;

    @Mock
    private TicketRepository ticketRepository;

    private ResourceService resourceService;

    @BeforeEach
    void setUp() {
        resourceService = new ResourceService(
            resourceRepository,
            resourceTypeRepository,
            locationRepository,
            resourceFeatureRepository,
            new ResourceMapper(),
            notificationService,
            bookingRepository,
            bookingModificationRepository,
            recurringBookingRepository,
            notificationEventLinkRepository,
            ticketRepository
        );
    }

    @Test
    void createResourceUsesTypeDefaultsAndIgnoresDisabledPayloadSections() {
        ResourceType resourceType = resourceType(
            "PROJECTOR",
            "Projector",
            ResourceCategory.TECHNICAL_EQUIPMENT,
            true,
            false,
            false,
            false,
            false,
            false,
            false,
            false
        );

        when(resourceRepository.existsByCodeIgnoreCase("PROJ-01")).thenReturn(false);
        when(resourceTypeRepository.findById(resourceType.getId())).thenReturn(Optional.of(resourceType));
        when(resourceRepository.save(any(ResourceEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ResourceResponse response = resourceService.createResource(new CreateResourceRequest(
            " proj-01 ",
            "Portable Projector",
            "Demo projector",
            resourceType.getId(),
            null,
            120,
            4,
            ResourceStatus.ACTIVE,
            false,
            true,
            LocalTime.of(8, 0),
            LocalTime.of(18, 0),
            "technical_manager",
            List.of("UNKNOWN_FEATURE"),
            List.of(availabilityWindow("MONDAY", "09:00", "11:00"))
        ));

        assertThat(response.code()).isEqualTo("PROJ-01");
        assertThat(response.bookable()).isTrue();
        assertThat(response.movable()).isFalse();
        assertThat(response.capacity()).isNull();
        assertThat(response.quantity()).isNull();
        assertThat(response.availableFrom()).isNull();
        assertThat(response.availableTo()).isNull();
        assertThat(response.features()).isEmpty();
        assertThat(response.availabilityWindows()).isEmpty();

        verify(resourceFeatureRepository, never()).findByCodeIgnoreCase(any());
        verify(notificationService).notifyResourceCreated(any(ResourceEntity.class), org.mockito.ArgumentMatchers.isNull());
    }

    @Test
    void createResourceRejectsMissingRequiredLocation() {
        ResourceType resourceType = resourceType(
            "LECTURE_HALL",
            "Lecture Hall",
            ResourceCategory.SPACES,
            true,
            false,
            true,
            true,
            true,
            true,
            true,
            true
        );

        when(resourceRepository.existsByCodeIgnoreCase("LH-01")).thenReturn(false);
        when(resourceTypeRepository.findById(resourceType.getId())).thenReturn(Optional.of(resourceType));

        assertThatThrownBy(() -> resourceService.createResource(new CreateResourceRequest(
            "LH-01",
            "Lecture Hall A",
            null,
            resourceType.getId(),
            null,
            null,
            null,
            ResourceStatus.ACTIVE,
            false,
            true,
            null,
            null,
            null,
            List.of(),
            List.of()
        )))
            .isInstanceOf(BadRequestException.class)
            .hasMessage("Location is required for the selected resource type.");
    }

    @Test
    void updateResourceAppliesSelectedTypeDefaultsAndClearsUnsupportedFields() {
        ResourceType originalType = resourceType(
            "LAB",
            "Laboratory",
            ResourceCategory.SPACES,
            true,
            false,
            true,
            true,
            false,
            true,
            true,
            true
        );
        ResourceType replacementType = resourceType(
            "CLEANING_EQUIPMENT",
            "Cleaning Equipment",
            ResourceCategory.MAINTENANCE_AND_CLEANING,
            false,
            true,
            false,
            false,
            false,
            true,
            false,
            false
        );

        Location existingLocation = new Location();
        existingLocation.setId(UUID.randomUUID());
        existingLocation.setLocationName("Lab Block");

        ResourceFeature existingFeature = new ResourceFeature();
        existingFeature.setCode("WIFI");
        existingFeature.setName("Wi-Fi");

        ResourceEntity resource = new ResourceEntity();
        resource.setId(UUID.randomUUID());
        resource.setCode("LAB-01");
        resource.setName("Legacy Lab");
        resource.setStatus(ResourceStatus.ACTIVE);
        resource.setResourceType(originalType);
        resource.setLocationEntity(existingLocation);
        resource.setCapacity(60);
        resource.setQuantity(2);
        resource.setBookable(true);
        resource.setMovable(false);
        resource.setAvailableFrom(LocalTime.of(8, 0));
        resource.setAvailableTo(LocalTime.of(16, 0));
        resource.setFeatures(new HashSet<>(List.of(existingFeature)));
        resource.setAvailabilityWindows(List.of(existingAvailabilityWindow("MONDAY", "08:00", "16:00")));

        when(resourceRepository.findById(resource.getId())).thenReturn(Optional.of(resource));
        when(resourceTypeRepository.findById(replacementType.getId())).thenReturn(Optional.of(replacementType));

        ResourceResponse response = resourceService.updateResource(resource.getId(), new UpdateResourceRequest(
            "Mobile Cleaning Kit",
            "Updated description",
            replacementType.getId(),
            null,
            999,
            7,
            ResourceStatus.MAINTENANCE,
            true,
            false,
            LocalTime.of(9, 0),
            LocalTime.of(17, 0),
            "facilities_manager",
            List.of("UNKNOWN_FEATURE"),
            List.of(availabilityWindow("TUESDAY", "09:00", "12:00"))
        ));

        assertThat(response.name()).isEqualTo("Mobile Cleaning Kit");
        assertThat(response.status()).isEqualTo(ResourceStatus.MAINTENANCE);
        assertThat(response.bookable()).isFalse();
        assertThat(response.movable()).isTrue();
        assertThat(response.capacity()).isNull();
        assertThat(response.quantity()).isEqualTo(7);
        assertThat(response.availableFrom()).isNull();
        assertThat(response.availableTo()).isNull();
        assertThat(response.features()).isEmpty();
        assertThat(response.availabilityWindows()).isEmpty();

        verify(resourceFeatureRepository, never()).findByCodeIgnoreCase(any());
        verify(notificationService).notifyResourceUpdated(resource, null);
    }

    @Test
    void updateResourceRejectsMissingRequiredCapacityForSelectedType() {
        ResourceType resourceType = resourceType(
            "AUDITORIUM",
            "Auditorium",
            ResourceCategory.SPACES,
            true,
            false,
            true,
            true,
            true,
            true,
            true,
            true
        );

        Location location = new Location();
        location.setId(UUID.randomUUID());
        location.setLocationName("Auditorium");

        ResourceEntity resource = new ResourceEntity();
        resource.setId(UUID.randomUUID());
        resource.setCode("AUD-01");
        resource.setName("Auditorium A");
        resource.setStatus(ResourceStatus.ACTIVE);
        resource.setResourceType(resourceType);
        resource.setLocationEntity(location);
        resource.setCapacity(null);
        resource.setBookable(true);
        resource.setMovable(false);

        when(resourceRepository.findById(resource.getId())).thenReturn(Optional.of(resource));

        assertThatThrownBy(() -> resourceService.updateResource(resource.getId(), new UpdateResourceRequest(
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null
        )))
            .isInstanceOf(BadRequestException.class)
            .hasMessage("Capacity is required for the selected resource type.");
    }

    @Test
    void createResourcePersistsAvailabilityWindowsAndFeatureMappings() {
        ResourceType resourceType = resourceType(
            "MEETING_ROOM",
            "Meeting Room",
            ResourceCategory.SPACES,
            true,
            false,
            true,
            true,
            false,
            false,
            true,
            true
        );
        Location location = new Location();
        location.setId(UUID.randomUUID());
        location.setLocationName("Board Room");

        ResourceFeature display = new ResourceFeature();
        display.setCode("DISPLAY");
        display.setName("Display");

        ResourceFeature whiteboard = new ResourceFeature();
        whiteboard.setCode("WHITEBOARD");
        whiteboard.setName("Whiteboard");

        when(resourceRepository.existsByCodeIgnoreCase("MR-01")).thenReturn(false);
        when(resourceTypeRepository.findById(resourceType.getId())).thenReturn(Optional.of(resourceType));
        when(locationRepository.findById(location.getId())).thenReturn(Optional.of(location));
        when(resourceFeatureRepository.findByCodeIgnoreCase("DISPLAY")).thenReturn(Optional.of(display));
        when(resourceFeatureRepository.findByCodeIgnoreCase("WHITEBOARD")).thenReturn(Optional.of(whiteboard));
        when(resourceRepository.save(any(ResourceEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ResourceResponse response = resourceService.createResource(new CreateResourceRequest(
            "MR-01",
            "Meeting Room 1",
            null,
            resourceType.getId(),
            location.getId(),
            12,
            null,
            ResourceStatus.ACTIVE,
            false,
            false,
            null,
            null,
            null,
            List.of("display", "whiteboard"),
            List.of(
                availabilityWindow("MONDAY", "09:00", "12:00"),
                availabilityWindow("WEDNESDAY", "13:00", "17:00")
            )
        ));

        assertThat(response.features()).extracting(feature -> feature.code()).containsExactly("DISPLAY", "WHITEBOARD");
        assertThat(response.availabilityWindows()).hasSize(2);
        assertThat(response.availabilityWindows()).extracting(window -> window.dayOfWeek().name())
            .containsExactly("MONDAY", "WEDNESDAY");
        assertThat(response.availableFrom()).isEqualTo(LocalTime.of(9, 0));
        assertThat(response.availableTo()).isEqualTo(LocalTime.of(17, 0));
    }

    @Test
    void createResourceRejectsDuplicateAvailabilityWindows() {
        ResourceType resourceType = resourceType(
            "LAB",
            "Laboratory",
            ResourceCategory.SPACES,
            true,
            false,
            true,
            true,
            false,
            false,
            true,
            false
        );
        Location location = new Location();
        location.setId(UUID.randomUUID());
        location.setLocationName("Lab Block");

        when(resourceRepository.existsByCodeIgnoreCase("LAB-09")).thenReturn(false);
        when(resourceTypeRepository.findById(resourceType.getId())).thenReturn(Optional.of(resourceType));
        when(locationRepository.findById(location.getId())).thenReturn(Optional.of(location));

        assertThatThrownBy(() -> resourceService.createResource(new CreateResourceRequest(
            "LAB-09",
            "Lab 09",
            null,
            resourceType.getId(),
            location.getId(),
            20,
            null,
            ResourceStatus.ACTIVE,
            true,
            false,
            null,
            null,
            null,
            List.of(),
            List.of(
                availabilityWindow("MONDAY", "09:00", "12:00"),
                availabilityWindow("MONDAY", "09:00", "12:00")
            )
        )))
            .isInstanceOf(BadRequestException.class)
            .hasMessage("Duplicate availability windows are not allowed.");
    }

    @Test
    void createResourceRejectsInvalidAvailabilityDay() {
        ResourceType resourceType = resourceType(
            "MEETING_ROOM",
            "Meeting Room",
            ResourceCategory.SPACES,
            true,
            false,
            true,
            true,
            false,
            false,
            true,
            false
        );
        Location location = new Location();
        location.setId(UUID.randomUUID());
        location.setLocationName("Board Room");

        when(resourceRepository.existsByCodeIgnoreCase("MR-02")).thenReturn(false);
        when(resourceTypeRepository.findById(resourceType.getId())).thenReturn(Optional.of(resourceType));
        when(locationRepository.findById(location.getId())).thenReturn(Optional.of(location));

        assertThatThrownBy(() -> resourceService.createResource(new CreateResourceRequest(
            "MR-02",
            "Meeting Room 2",
            null,
            resourceType.getId(),
            location.getId(),
            10,
            null,
            ResourceStatus.ACTIVE,
            true,
            false,
            null,
            null,
            null,
            List.of(),
            List.of(availabilityWindow("FUNDAY", "09:00", "12:00"))
        )))
            .isInstanceOf(BadRequestException.class)
            .hasMessage("Availability window day of week is invalid.");
    }

    private ResourceType resourceType(
        String code,
        String name,
        ResourceCategory category,
        boolean bookableDefault,
        boolean movableDefault,
        boolean locationRequired,
        boolean capacityEnabled,
        boolean capacityRequired,
        boolean quantityEnabled,
        boolean availabilityEnabled,
        boolean featuresEnabled
    ) {
        ResourceType resourceType = new ResourceType();
        resourceType.setId(UUID.randomUUID());
        resourceType.setCode(code);
        resourceType.setName(name);
        resourceType.setCategory(category);
        resourceType.setBookableDefault(bookableDefault);
        resourceType.setMovableDefault(movableDefault);
        resourceType.setLocationRequired(locationRequired);
        resourceType.setCapacityEnabled(capacityEnabled);
        resourceType.setCapacityRequired(capacityRequired);
        resourceType.setQuantityEnabled(quantityEnabled);
        resourceType.setAvailabilityEnabled(availabilityEnabled);
        resourceType.setFeaturesEnabled(featuresEnabled);
        return resourceType;
    }

    private AvailabilityWindowRequest availabilityWindow(String dayOfWeek, String startTime, String endTime) {
        return new AvailabilityWindowRequest(dayOfWeek, LocalTime.parse(startTime), LocalTime.parse(endTime));
    }

    private ResourceAvailabilityWindow existingAvailabilityWindow(String dayOfWeek, String startTime, String endTime) {
        ResourceAvailabilityWindow availabilityWindow = new ResourceAvailabilityWindow();
        availabilityWindow.setId(UUID.randomUUID());
        availabilityWindow.setDayOfWeek(java.time.DayOfWeek.valueOf(dayOfWeek));
        availabilityWindow.setStartTime(LocalTime.parse(startTime));
        availabilityWindow.setEndTime(LocalTime.parse(endTime));
        availabilityWindow.setActive(true);
        return availabilityWindow;
    }
}
