package com.university.smartcampus.resource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.university.smartcampus.AppEnums.ResourceCategory;
import com.university.smartcampus.common.exception.BadRequestException;
import com.university.smartcampus.resource.ResourceTypeDtos.CreateResourceTypeRequest;
import com.university.smartcampus.resource.ResourceTypeDtos.ResourceTypeResponse;
import com.university.smartcampus.resource.ResourceTypeDtos.UpdateResourceTypeRequest;

@ExtendWith(MockitoExtension.class)
class ResourceTypeServiceTest {

    @Mock
    private ResourceTypeRepository resourceTypeRepository;

    @Mock
    private ResourceRepository resourceRepository;

    private ResourceTypeService resourceTypeService;

    @BeforeEach
    void setUp() {
        resourceTypeService = new ResourceTypeService(
            resourceTypeRepository,
            resourceRepository,
            new ResourceTypeMapper()
        );
    }

    @Test
    void createResourceTypePersistsRuleFlags() {
        when(resourceTypeRepository.existsByCodeIgnoreCase("STUDY_ROOM")).thenReturn(false);
        when(resourceTypeRepository.existsByNameIgnoreCase("Study Room")).thenReturn(false);
        when(resourceTypeRepository.save(any(ResourceType.class))).thenAnswer(invocation -> {
            ResourceType entity = invocation.getArgument(0);
            entity.setId(UUID.randomUUID());
            return entity;
        });

        ResourceTypeResponse response = resourceTypeService.createResourceType(new CreateResourceTypeRequest(
            "study_room",
            "Study Room",
            ResourceCategory.SPACES,
            "Quiet individual and group study space.",
            true,
            false,
            true,
            true,
            true,
            true,
            true,
            true
        ));

        assertThat(response.code()).isEqualTo("STUDY_ROOM");
        assertThat(response.locationRequired()).isTrue();
        assertThat(response.capacityEnabled()).isTrue();
        assertThat(response.capacityRequired()).isTrue();
        assertThat(response.quantityEnabled()).isTrue();
        assertThat(response.availabilityEnabled()).isTrue();
        assertThat(response.featuresEnabled()).isTrue();
    }

    @Test
    void createResourceTypeRejectsRequiredCapacityWhenCapacityDisabled() {
        assertThatThrownBy(() -> resourceTypeService.createResourceType(new CreateResourceTypeRequest(
            "general",
            "General",
            ResourceCategory.GENERAL_UTILITY,
            null,
            false,
            false,
            false,
            false,
            true,
            true,
            true,
            false
        )))
            .isInstanceOf(BadRequestException.class)
            .hasMessage("Capacity is required only when capacity is enabled.");

        verify(resourceTypeRepository, never()).save(any(ResourceType.class));
    }

    @Test
    void updateResourceTypeTurningOffCapacityUnsetsCapacityRequired() {
        ResourceType existing = new ResourceType();
        existing.setId(UUID.randomUUID());
        existing.setCode("LECTURE_HALL");
        existing.setName("Lecture Hall");
        existing.setCategory(ResourceCategory.SPACES);
        existing.setCapacityEnabled(true);
        existing.setCapacityRequired(true);
        existing.setQuantityEnabled(true);
        existing.setAvailabilityEnabled(true);

        when(resourceTypeRepository.findById(existing.getId())).thenReturn(Optional.of(existing));

        ResourceTypeResponse response = resourceTypeService.updateResourceType(existing.getId(), new UpdateResourceTypeRequest(
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            false,
            null,
            null,
            null,
            null
        ));

        assertThat(response.capacityEnabled()).isFalse();
        assertThat(response.capacityRequired()).isFalse();
        assertThat(existing.isCapacityRequired()).isFalse();
    }

    @Test
    void updateResourceTypeRejectsEnablingRequiredCapacityWithoutCapacity() {
        ResourceType existing = new ResourceType();
        existing.setId(UUID.randomUUID());
        existing.setCode("GENERAL_RESOURCE");
        existing.setName("General Resource");
        existing.setCategory(ResourceCategory.GENERAL_UTILITY);
        existing.setCapacityEnabled(false);
        existing.setCapacityRequired(false);

        when(resourceTypeRepository.findById(existing.getId())).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> resourceTypeService.updateResourceType(existing.getId(), new UpdateResourceTypeRequest(
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            true,
            null,
            null,
            null
        )))
            .isInstanceOf(BadRequestException.class)
            .hasMessage("Capacity is required only when capacity is enabled.");
    }
}
