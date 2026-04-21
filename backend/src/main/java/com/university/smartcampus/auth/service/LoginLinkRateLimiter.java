package com.university.smartcampus.auth.service;

import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import com.university.smartcampus.config.SmartCampusProperties;

@Component
public class LoginLinkRateLimiter {

    private static final Logger LOGGER = LoggerFactory.getLogger(LoginLinkRateLimiter.class);
    private static final String UNKNOWN_IP = "unknown";
    private static final String UNKNOWN_EMAIL = "unknown@example.invalid";

    private final SmartCampusProperties properties;
    private final Map<String, WindowCounter> ipCounters = new ConcurrentHashMap<>();
    private final Map<String, WindowCounter> emailCounters = new ConcurrentHashMap<>();
    private final Map<String, Instant> emailLastAllowed = new ConcurrentHashMap<>();
    private volatile Instant lastCleanupAt = Instant.EPOCH;

    public LoginLinkRateLimiter(SmartCampusProperties properties) {
        this.properties = properties;
    }

    public boolean allow(String email, String clientIp) {
        SmartCampusProperties.LoginLinkRateLimit rateLimit = properties.getAuth().getLoginLinkRateLimit();
        if (!rateLimit.isEnabled()) {
            return true;
        }

        Instant now = Instant.now();
        cleanupIfNeeded(now, rateLimit);

        String normalizedEmail = normalizeEmail(email);
        String normalizedIp = normalizeIp(clientIp);

        if (!allowWithinWindow(ipCounters, normalizedIp, rateLimit.getPerIpMaxRequests(),
                rateLimit.getPerIpWindowSeconds(), now)) {
            LOGGER.debug("Blocked login-link request for email {} due to IP rate limit.", normalizedEmail);
            return false;
        }

        if (!allowWithinWindow(emailCounters, normalizedEmail, rateLimit.getPerEmailMaxRequests(),
                rateLimit.getPerEmailWindowSeconds(), now)) {
            LOGGER.debug("Blocked login-link request for email {} due to email-window rate limit.", normalizedEmail);
            return false;
        }

        int minIntervalSeconds = Math.max(0, rateLimit.getPerEmailMinIntervalSeconds());
        if (minIntervalSeconds > 0) {
            Instant lastAllowedAt = emailLastAllowed.get(normalizedEmail);
            if (lastAllowedAt != null
                    && Duration.between(lastAllowedAt, now).compareTo(Duration.ofSeconds(minIntervalSeconds)) < 0) {
                LOGGER.debug("Blocked login-link request for email {} due to minimum interval.", normalizedEmail);
                return false;
            }
        }

        emailLastAllowed.put(normalizedEmail, now);
        return true;
    }

    private boolean allowWithinWindow(
            Map<String, WindowCounter> counters,
            String key,
            int maxRequests,
            int windowSeconds,
            Instant now) {
        if (maxRequests <= 0 || windowSeconds <= 0) {
            return true;
        }

        WindowCounter counter = counters.compute(key, (ignored, current) -> {
            if (current == null || isWindowExpired(current.windowStartedAt(), now, windowSeconds)) {
                return new WindowCounter(now, 1);
            }

            return new WindowCounter(current.windowStartedAt(), current.count() + 1);
        });

        return counter.count() <= maxRequests;
    }

    private void cleanupIfNeeded(Instant now, SmartCampusProperties.LoginLinkRateLimit rateLimit) {
        if (Duration.between(lastCleanupAt, now).compareTo(Duration.ofSeconds(60)) < 0) {
            return;
        }

        synchronized (this) {
            if (Duration.between(lastCleanupAt, now).compareTo(Duration.ofSeconds(60)) < 0) {
                return;
            }

            int maxWindowSeconds = Math.max(rateLimit.getPerIpWindowSeconds(), rateLimit.getPerEmailWindowSeconds());
            Instant staleWindowThreshold = now.minusSeconds(Math.max(60L, maxWindowSeconds * 2L));
            Instant staleIntervalThreshold = now.minusSeconds(Math.max(60L,
                    Math.max(1, rateLimit.getPerEmailMinIntervalSeconds()) * 2L));

            ipCounters.entrySet().removeIf(entry -> entry.getValue().windowStartedAt().isBefore(staleWindowThreshold));
            emailCounters.entrySet().removeIf(entry -> entry.getValue().windowStartedAt().isBefore(staleWindowThreshold));
            emailLastAllowed.entrySet().removeIf(entry -> entry.getValue().isBefore(staleIntervalThreshold));

            lastCleanupAt = now;
        }
    }

    private boolean isWindowExpired(Instant windowStartedAt, Instant now, int windowSeconds) {
        return Duration.between(windowStartedAt, now).compareTo(Duration.ofSeconds(windowSeconds)) >= 0;
    }

    private String normalizeEmail(String email) {
        if (!StringUtils.hasText(email)) {
            return UNKNOWN_EMAIL;
        }

        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeIp(String clientIp) {
        if (!StringUtils.hasText(clientIp)) {
            return UNKNOWN_IP;
        }

        return clientIp.trim().toLowerCase(Locale.ROOT);
    }

    private record WindowCounter(Instant windowStartedAt, int count) {
    }
}
