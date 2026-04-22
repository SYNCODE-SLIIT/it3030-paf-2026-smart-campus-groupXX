package com.university.smartcampus.booking;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.stereotype.Component;

@Component
public class BookingDurationPolicy {

    private static final Map<String, Integer> MAX_DURATION_MINUTES_BY_SUBCATEGORY = createRules();

    public Integer getMaxDurationMinutes(String subcategory) {
        String normalizedSubcategory = normalizeSubcategory(subcategory);
        if (normalizedSubcategory == null) {
            return null;
        }
        return MAX_DURATION_MINUTES_BY_SUBCATEGORY.get(normalizedSubcategory);
    }

    public boolean isDurationAllowed(String subcategory, long minutes) {
        Integer maxDurationMinutes = getMaxDurationMinutes(subcategory);
        return maxDurationMinutes == null || minutes <= maxDurationMinutes;
    }

    public String normalizeSubcategory(String subcategory) {
        if (subcategory == null) {
            return null;
        }

        String normalized = subcategory.trim();
        if (normalized.isEmpty()) {
            return null;
        }

        normalized = normalized
            .replace(' ', '_')
            .replace('-', '_')
            .toUpperCase();

        return normalized;
    }

    private static Map<String, Integer> createRules() {
        Map<String, Integer> rules = new LinkedHashMap<>();
        rules.put("LECTURE_HALL", 180);
        rules.put("LABORATORY", 180);
        rules.put("LIBRARY_SPACE", 180);
        rules.put("MEETING_ROOM", null);
        rules.put("EVENT_SPACE", null);
        return Collections.unmodifiableMap(rules);
    }
}
