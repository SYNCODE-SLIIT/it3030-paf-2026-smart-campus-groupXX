package com.university.smartcampus.resource;

import java.util.List;
import java.util.UUID;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.university.smartcampus.resource.ResourceDtos.PublicCatalogResourcePage;
import com.university.smartcampus.resource.ResourceDtos.PublicCatalogTypeSummary;

@RestController
@RequestMapping("/api/public/catalog")
public class PublicCatalogController {

    private final PublicCatalogService publicCatalogService;

    public PublicCatalogController(PublicCatalogService publicCatalogService) {
        this.publicCatalogService = publicCatalogService;
    }

    @GetMapping("/types")
    public List<PublicCatalogTypeSummary> listTypes(
        @RequestParam(value = "search", required = false) String search,
        @RequestParam(value = "filter", required = false, defaultValue = "ALL") String filter
    ) {
        return publicCatalogService.listPublicCatalogTypeSummaries(search, filter);
    }

    @GetMapping("/types/{resourceTypeId}/resources")
    public PublicCatalogResourcePage listResourcesForType(
        @PathVariable UUID resourceTypeId,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "5") int size,
        @RequestParam(value = "search", required = false) String search,
        @RequestParam(value = "filter", required = false, defaultValue = "ALL") String filter
    ) {
        return publicCatalogService.listPublicCatalogResourcePage(resourceTypeId, page, size, search, filter);
    }
}
