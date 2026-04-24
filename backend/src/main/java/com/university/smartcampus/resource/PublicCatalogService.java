package com.university.smartcampus.resource;

import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.university.smartcampus.AppEnums.ResourceStatus;
import com.university.smartcampus.common.exception.NotFoundException;
import com.university.smartcampus.common.exception.BadRequestException;
import com.university.smartcampus.resource.ResourceDtos.PublicCatalogResourceItem;
import com.university.smartcampus.resource.ResourceDtos.PublicCatalogResourcePage;
import com.university.smartcampus.resource.ResourceDtos.PublicCatalogTypeSummary;

@Service
public class PublicCatalogService {

    private static final int PUBLIC_CATALOG_MAX_PAGE_SIZE = 20;
    private static final int PUBLIC_CATALOG_DEFAULT_PAGE_SIZE = 5;

    private static final Set<String> ALLOWED_FILTER_MODES = Set.of("ALL", "RESOURCE_TYPES", "RESOURCES");

    private final ResourceRepository resourceRepository;
    private final ResourceTypeRepository resourceTypeRepository;

    public PublicCatalogService(
        ResourceRepository resourceRepository,
        ResourceTypeRepository resourceTypeRepository
    ) {
        this.resourceRepository = resourceRepository;
        this.resourceTypeRepository = resourceTypeRepository;
    }

    @Transactional(readOnly = true)
    public List<PublicCatalogTypeSummary> listPublicCatalogTypeSummaries(String search, String filterMode) {
        String mode = normalizeFilterMode(filterMode);
        String pattern = buildSearchPattern(search);
        return resourceRepository.findPublicCatalogTypeSummaries(ResourceStatus.ACTIVE, pattern, mode);
    }

    @Transactional(readOnly = true)
    public PublicCatalogResourcePage listPublicCatalogResourcePage(
        UUID resourceTypeId,
        int page,
        int size,
        String search,
        String filterMode
    ) {
        if (!resourceTypeRepository.existsById(resourceTypeId)) {
            throw new NotFoundException("Resource type not found.");
        }
        String mode = normalizeFilterMode(filterMode);
        String pattern = buildSearchPattern(search);
        int safePage = Math.max(page, 0);
        int safeSize = size <= 0 ? PUBLIC_CATALOG_DEFAULT_PAGE_SIZE : Math.min(size, PUBLIC_CATALOG_MAX_PAGE_SIZE);
        Page<PublicCatalogResourceItem> result = resourceRepository.findPublicCatalogResourcesByType(
            resourceTypeId,
            ResourceStatus.ACTIVE,
            pattern,
            mode,
            PageRequest.of(safePage, safeSize)
        );
        return new PublicCatalogResourcePage(
            result.getContent(),
            result.getNumber(),
            result.getSize(),
            result.getTotalElements(),
            result.getTotalPages()
        );
    }

    private static String normalizeFilterMode(String filterMode) {
        if (!StringUtils.hasText(filterMode)) {
            return "ALL";
        }
        String upper = filterMode.trim().toUpperCase(Locale.ROOT);
        if (!ALLOWED_FILTER_MODES.contains(upper)) {
            throw new BadRequestException("Invalid filter mode. Use ALL, RESOURCE_TYPES, or RESOURCES.");
        }
        return upper;
    }

    private static String buildSearchPattern(String search) {
        if (!StringUtils.hasText(search)) {
            return null;
        }
        String trimmed = search.trim().toLowerCase(Locale.ROOT);
        if (trimmed.isEmpty()) {
            return null;
        }
        return "%" + trimmed + "%";
    }
}
