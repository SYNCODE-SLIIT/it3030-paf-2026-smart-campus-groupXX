package com.university.smartcampus;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Transactional;

import com.university.smartcampus.AppEnums.ResourceCategory;
import com.university.smartcampus.AppEnums.ResourceStatus;
import com.university.smartcampus.resource.ResourceDtos.AvailabilityWindowRequest;
import com.university.smartcampus.resource.ResourceDtos.CreateResourceRequest;
import com.university.smartcampus.resource.ResourceDtos.ResourceListPage;
import com.university.smartcampus.resource.ResourceDtos.ResourceResponse;
import com.university.smartcampus.resource.ResourceDtos.UpdateResourceRequest;
import com.university.smartcampus.resource.ResourceEntity;
import com.university.smartcampus.resource.ResourceFeature;
import com.university.smartcampus.resource.ResourceFeatureRepository;
import com.university.smartcampus.resource.Location;
import com.university.smartcampus.resource.LocationRepository;
import com.university.smartcampus.resource.ResourceRepository;
import com.university.smartcampus.resource.ResourceService;
import com.university.smartcampus.resource.ResourceType;
import com.university.smartcampus.resource.ResourceTypeRepository;

@SpringBootTest
@Import(TestAuthProviderConfiguration.class)
@Transactional
class ResourceServiceTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private ResourceService resourceService;

    @Autowired
    private ResourceRepository resourceRepository;

    @Autowired
    private ResourceTypeRepository resourceTypeRepository;

    @Autowired
    private LocationRepository locationRepository;

    @Autowired
    private ResourceFeatureRepository resourceFeatureRepository;

    @Test
    void createResourceNormalizesCodeAndPersistsNormalizedRelationships() {
        ResourceType resourceType = seedResourceType("GENERAL_RESOURCE", "General Resource", ResourceCategory.GENERAL_UTILITY);
        Location location = seedLocation("Test Location");
        seedFeature("PROJECTOR", "Projector");
        seedFeature("WIFI", "Wi-Fi");

        ResourceResponse response = resourceService.createResource(new CreateResourceRequest(
            " lab-01 ",
            "Innovation Lab",
            "High-end computing lab",
            resourceType.getId(),
            location.getId(),
            40,
            1,
            ResourceStatus.ACTIVE,
            true,
            false,
            null,
            null,
            "technical_manager",
            List.of("wifi", "projector"),
            List.of(
                new AvailabilityWindowRequest("MONDAY", java.time.LocalTime.of(8, 0), java.time.LocalTime.of(12, 0)),
                new AvailabilityWindowRequest("WEDNESDAY", java.time.LocalTime.of(10, 0), java.time.LocalTime.of(18, 0))
            )
        ));

        assertThat(response.code()).isEqualTo("LAB-01");
        assertThat(response.name()).isEqualTo("Innovation Lab");
        assertThat(response.resourceType()).isNotNull();
        assertThat(response.resourceType().id()).isEqualTo(resourceType.getId());
        assertThat(response.resourceType().code()).isEqualTo("GENERAL_RESOURCE");
        assertThat(response.resourceType().category()).isEqualTo("GENERAL_UTILITY");
        assertThat(response.locationDetails()).isNotNull();
        assertThat(response.locationDetails().id()).isEqualTo(location.getId());
        assertThat(response.locationDetails().locationName()).isEqualTo("Test Location");
        assertThat(response.features()).extracting(feature -> feature.code()).containsExactly("PROJECTOR", "WIFI");
        assertThat(response.availabilityWindows()).hasSize(2);
        assertThat(response.createdAt()).isNotNull();
        assertThat(response.updatedAt()).isNotNull();

        ResourceEntity persisted = resourceRepository.findById(response.id()).orElseThrow();
        assertThat(persisted.getResourceType()).isNotNull();
        assertThat(persisted.getResourceType().getId()).isEqualTo(resourceType.getId());
        assertThat(persisted.getLocationEntity()).isNotNull();
        assertThat(persisted.getLocationEntity().getId()).isEqualTo(location.getId());
        assertThat(persisted.getManagedByRole()).isEqualTo("TECHNICAL_MANAGER");
        assertThat(persisted.getFeatures()).extracting(ResourceFeature::getCode).containsExactlyInAnyOrder("PROJECTOR", "WIFI");
        assertThat(persisted.getAvailabilityWindows()).hasSize(2);
        assertThat(persisted.getCategory()).isEqualTo(ResourceCategory.GENERAL_UTILITY);
        assertThat(persisted.getSubcategory()).isEqualTo("General Resource");
        assertThat(persisted.getLocation()).isEqualTo("Test Location");
    }

    @Test
    void getResourcesAppliesSearchCategoryStatusAndLocationFilters() {
        ResourceType spaceType = seedResourceType("LIBRARY_ROOM", "Library Room", ResourceCategory.SPACES);
        ResourceType transportType = seedResourceType("GENERAL_TRANSPORT", "General Transport", ResourceCategory.TRANSPORT_AND_LOGISTICS);
        ResourceType eventType = seedResourceType("EVENT_EQUIPMENT", "Event Equipment", ResourceCategory.EVENT_AND_DECORATION);

        seedResource("LIB-01", "Main Library", spaceType, ResourceStatus.ACTIVE, seedLocation("Library Wing"));
        seedResource("BUS-01", "Campus Shuttle", transportType, ResourceStatus.MAINTENANCE, seedLocation("North Gate"));
        seedResource("MIC-01", "Wireless Microphone", eventType, ResourceStatus.ACTIVE, seedLocation("Auditorium"));

        ResourceListPage filtered = resourceService.getResources(
            "shuttle",
            ResourceCategory.TRANSPORT_AND_LOGISTICS,
            ResourceStatus.MAINTENANCE,
            "north",
            0,
            50
        );

        assertThat(filtered.items()).hasSize(1);
        assertThat(filtered.items().get(0).code()).isEqualTo("BUS-01");
    }

    @Test
    void updateResourceReplacesNormalizedRelationshipsAndMirrorsLegacyFields() {
        ResourceType originalType = seedResourceType("GENERAL_RESOURCE", "General Resource", ResourceCategory.GENERAL_UTILITY);
        Location originalLocation = seedLocation("Old Location");
        ResourceType replacementType = seedResourceType("LECTURE_HALL", "Lecture Hall", ResourceCategory.SPACES, false, true);
        Location replacementLocation = seedLocation("New Location");
        seedFeature("AIR_CONDITIONING", "Air Conditioning");
        seedFeature("MICROPHONE", "Microphone");

        ResourceEntity resource = seedResource("ROOM-02", "Room 2", originalType, ResourceStatus.ACTIVE, originalLocation);

        ResourceResponse response = resourceService.updateResource(resource.getId(), new UpdateResourceRequest(
            "Updated Room 2",
            "Updated description",
            replacementType.getId(),
            replacementLocation.getId(),
            120,
            3,
            ResourceStatus.MAINTENANCE,
            false,
            true,
            null,
            null,
            "facilities_manager",
            List.of("air_conditioning", "microphone"),
            List.of(new AvailabilityWindowRequest("FRIDAY", java.time.LocalTime.of(9, 0), java.time.LocalTime.of(17, 0)))
        ));

        assertThat(response.name()).isEqualTo("Updated Room 2");
        assertThat(response.description()).isEqualTo("Updated description");
        assertThat(response.status()).isEqualTo(ResourceStatus.MAINTENANCE);
        assertThat(response.bookable()).isFalse();
        assertThat(response.movable()).isTrue();
        assertThat(response.resourceType()).isNotNull();
        assertThat(response.resourceType().id()).isEqualTo(replacementType.getId());
        assertThat(response.locationDetails()).isNotNull();
        assertThat(response.locationDetails().id()).isEqualTo(replacementLocation.getId());
        assertThat(response.features()).extracting(feature -> feature.code()).containsExactly("AIR_CONDITIONING", "MICROPHONE");
        assertThat(response.availabilityWindows()).hasSize(1);

        ResourceEntity persisted = resourceRepository.findById(resource.getId()).orElseThrow();
        assertThat(persisted.getName()).isEqualTo("Updated Room 2");
        assertThat(persisted.getDescription()).isEqualTo("Updated description");
        assertThat(persisted.getResourceType().getId()).isEqualTo(replacementType.getId());
        assertThat(persisted.getLocationEntity().getId()).isEqualTo(replacementLocation.getId());
        assertThat(persisted.getManagedByRole()).isEqualTo("FACILITIES_MANAGER");
        assertThat(persisted.getFeatures()).extracting(ResourceFeature::getCode).containsExactlyInAnyOrder("AIR_CONDITIONING", "MICROPHONE");
        assertThat(persisted.getAvailabilityWindows()).hasSize(1);
        assertThat(persisted.getCategory()).isEqualTo(ResourceCategory.SPACES);
        assertThat(persisted.getSubcategory()).isEqualTo("Lecture Hall");
        assertThat(persisted.getLocation()).isEqualTo("New Location");
    }

    @Test
    void deleteResourceSoftDeletesInsteadOfRemovingRow() {
        ResourceType resourceType = seedResourceType("GENERAL_RESOURCE", "General Resource", ResourceCategory.GENERAL_UTILITY);
        ResourceEntity resource = seedResource("GEN-01", "Generator", resourceType, ResourceStatus.ACTIVE, seedLocation("Utility Yard"));

        var response = resourceService.deleteResource(resource.getId());

        assertThat(response.message()).isEqualTo("Resource removed.");
        ResourceEntity persisted = resourceRepository.findById(resource.getId()).orElseThrow();
        assertThat(persisted.getStatus()).isEqualTo(ResourceStatus.INACTIVE);
    }

    private ResourceEntity seedResource(String code, String name, ResourceType resourceType, ResourceStatus status, Location location) {
        ResourceEntity resource = new ResourceEntity();
        resource.setId(UUID.randomUUID());
        resource.setCode(code);
        resource.setName(name);
        resource.setResourceType(resourceType);
        resource.setLocationEntity(location);
        resource.setCategory(resourceType.getCategory());
        resource.setSubcategory(resourceType.getName());
        resource.setDescription(name + " description");
        resource.setLocation(location.getLocationName());
        resource.setCapacity(10);
        resource.setQuantity(1);
        resource.setStatus(status);
        resource.setBookable(true);
        resource.setMovable(false);
        return resourceRepository.save(resource);
    }

    private ResourceType seedResourceType(String code, String name, ResourceCategory category) {
        return seedResourceType(code, name, category, true, false);
    }

    private ResourceType seedResourceType(
        String code,
        String name,
        ResourceCategory category,
        boolean bookableDefault,
        boolean movableDefault
    ) {
        return resourceTypeRepository.findByCodeIgnoreCase(code)
            .map(resourceType -> {
                resourceType.setName(name);
                resourceType.setCategory(category);
                resourceType.setDescription(name + " type");
                resourceType.setBookableDefault(bookableDefault);
                resourceType.setMovableDefault(movableDefault);
                resourceType.setFeaturesEnabled(true);
                resourceType.setAvailabilityEnabled(true);
                resourceType.setQuantityEnabled(true);
                return resourceTypeRepository.save(resourceType);
            })
            .orElseGet(() -> {
                ResourceType resourceType = new ResourceType();
                resourceType.setCode(code);
                resourceType.setName(name);
                resourceType.setCategory(category);
                resourceType.setDescription(name + " type");
                resourceType.setBookableDefault(bookableDefault);
                resourceType.setMovableDefault(movableDefault);
                resourceType.setFeaturesEnabled(true);
                resourceType.setAvailabilityEnabled(true);
                resourceType.setQuantityEnabled(true);
                return resourceTypeRepository.save(resourceType);
            });
    }

    private Location seedLocation(String locationName) {
        return locationRepository.findByLocationNameIgnoreCase(locationName)
            .orElseGet(() -> {
                Location location = new Location();
                location.setLocationName(locationName);
                location.setLocationType("OTHER");
                return locationRepository.save(location);
            });
    }

    private ResourceFeature seedFeature(String code, String name) {
        return resourceFeatureRepository.findByCodeIgnoreCase(code)
            .orElseGet(() -> {
                ResourceFeature feature = new ResourceFeature();
                feature.setCode(code);
                feature.setName(name);
                feature.setDescription(name + " feature");
                return resourceFeatureRepository.save(feature);
            });
    }
}
