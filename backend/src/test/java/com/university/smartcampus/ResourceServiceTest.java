package com.university.smartcampus;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Transactional;

import com.university.smartcampus.AppEnums.ResourceCategory;
import com.university.smartcampus.AppEnums.ResourceStatus;
import com.university.smartcampus.common.exception.ConflictException;
import com.university.smartcampus.resource.ResourceDtos.CreateResourceRequest;
import com.university.smartcampus.resource.ResourceDtos.ResourceResponse;
import com.university.smartcampus.resource.ResourceDtos.UpdateResourceRequest;
import com.university.smartcampus.resource.ResourceEntity;
import com.university.smartcampus.resource.ResourceRepository;
import com.university.smartcampus.resource.ResourceService;

@SpringBootTest
@Import(TestAuthProviderConfiguration.class)
@Transactional
class ResourceServiceTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private ResourceService resourceService;

    @Autowired
    private ResourceRepository resourceRepository;

    @Test
    void createResourceNormalizesCodeAndPersistsIt() {
        ResourceResponse response = resourceService.createResource(new CreateResourceRequest(
            " lab-01 ",
            "Innovation Lab",
            ResourceCategory.SPACES,
            "Computer Lab",
            "High-end computing lab",
            "Engineering Block A",
            40,
            1,
            ResourceStatus.ACTIVE,
            true,
            false,
            LocalTime.of(8, 0),
            LocalTime.of(18, 0)
        ));

        assertThat(response.code()).isEqualTo("LAB-01");
        assertThat(response.name()).isEqualTo("Innovation Lab");
        assertThat(response.createdAt()).isNotNull();
        assertThat(response.updatedAt()).isNotNull();
    }

    @Test
    void getResourcesAppliesSearchCategoryStatusAndLocationFilters() {
        seedResource("LIB-01", "Main Library", ResourceCategory.SPACES, ResourceStatus.ACTIVE, "Library Wing");
        seedResource("BUS-01", "Campus Shuttle", ResourceCategory.TRANSPORT_AND_LOGISTICS, ResourceStatus.MAINTENANCE, "North Gate");
        seedResource("MIC-01", "Wireless Microphone", ResourceCategory.EVENT_AND_DECORATION, ResourceStatus.ACTIVE, "Auditorium");

        List<ResourceResponse> filtered = resourceService.getResources(
            "shuttle",
            ResourceCategory.TRANSPORT_AND_LOGISTICS,
            ResourceStatus.MAINTENANCE,
            "north"
        );

        assertThat(filtered).hasSize(1);
        assertThat(filtered.get(0).code()).isEqualTo("BUS-01");
    }

    @Test
    void updateResourceRejectsDuplicateCode() {
        ResourceEntity first = seedResource("ROOM-01", "Room 1", ResourceCategory.SPACES, ResourceStatus.ACTIVE, "Block A");
        ResourceEntity second = seedResource("ROOM-02", "Room 2", ResourceCategory.SPACES, ResourceStatus.ACTIVE, "Block B");

        assertThatThrownBy(() -> resourceService.updateResource(second.getId(), new UpdateResourceRequest(
            "room-01",
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
            .isInstanceOf(ConflictException.class)
            .hasMessage("A resource with this code already exists.");

        assertThat(resourceRepository.findById(first.getId())).isPresent();
    }

    @Test
    void deleteResourceSoftDeletesInsteadOfRemovingRow() {
        ResourceEntity resource = seedResource("GEN-01", "Generator", ResourceCategory.GENERAL_UTILITY, ResourceStatus.ACTIVE, "Utility Yard");

        var response = resourceService.deleteResource(resource.getId());

        assertThat(response.message()).isEqualTo("Resource removed.");
        ResourceEntity persisted = resourceRepository.findById(resource.getId()).orElseThrow();
        assertThat(persisted.getStatus()).isEqualTo(ResourceStatus.INACTIVE);
    }

    private ResourceEntity seedResource(String code, String name, ResourceCategory category, ResourceStatus status, String location) {
        ResourceEntity resource = new ResourceEntity();
        resource.setId(UUID.randomUUID());
        resource.setCode(code);
        resource.setName(name);
        resource.setCategory(category);
        resource.setSubcategory("Seeded");
        resource.setDescription(name + " description");
        resource.setLocation(location);
        resource.setCapacity(10);
        resource.setQuantity(1);
        resource.setStatus(status);
        resource.setBookable(true);
        resource.setMovable(false);
        resource.setAvailableFrom(LocalTime.of(8, 0));
        resource.setAvailableTo(LocalTime.of(17, 0));
        return resourceRepository.save(resource);
    }
}
