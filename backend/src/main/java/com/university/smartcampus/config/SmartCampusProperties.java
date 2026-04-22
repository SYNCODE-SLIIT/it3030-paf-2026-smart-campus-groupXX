package com.university.smartcampus.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public class SmartCampusProperties {

    private final Auth auth = new Auth();
    private final Security security = new Security();
    private final Bootstrap bootstrap = new Bootstrap();
    private final Storage storage = new Storage();
    private final Notifications notifications = new Notifications();

    public Auth getAuth() {
        return auth;
    }

    public Security getSecurity() {
        return security;
    }

    public Bootstrap getBootstrap() {
        return bootstrap;
    }

    public Storage getStorage() {
        return storage;
    }

    public Notifications getNotifications() {
        return notifications;
    }

    public static class Auth {
        private final Delivery delivery = new Delivery();
        private final Supabase supabase = new Supabase();
        private final LoginLinkRateLimit loginLinkRateLimit = new LoginLinkRateLimit();

        public Delivery getDelivery() {
            return delivery;
        }

        public Supabase getSupabase() {
            return supabase;
        }

        public LoginLinkRateLimit getLoginLinkRateLimit() {
            return loginLinkRateLimit;
        }
    }

    public static class LoginLinkRateLimit {
        private boolean enabled = true;
        private int perIpMaxRequests = 20;
        private int perIpWindowSeconds = 60;
        private int perEmailMaxRequests = 5;
        private int perEmailWindowSeconds = 300;
        private int perEmailMinIntervalSeconds = 60;

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public int getPerIpMaxRequests() {
            return perIpMaxRequests;
        }

        public void setPerIpMaxRequests(int perIpMaxRequests) {
            this.perIpMaxRequests = perIpMaxRequests;
        }

        public int getPerIpWindowSeconds() {
            return perIpWindowSeconds;
        }

        public void setPerIpWindowSeconds(int perIpWindowSeconds) {
            this.perIpWindowSeconds = perIpWindowSeconds;
        }

        public int getPerEmailMaxRequests() {
            return perEmailMaxRequests;
        }

        public void setPerEmailMaxRequests(int perEmailMaxRequests) {
            this.perEmailMaxRequests = perEmailMaxRequests;
        }

        public int getPerEmailWindowSeconds() {
            return perEmailWindowSeconds;
        }

        public void setPerEmailWindowSeconds(int perEmailWindowSeconds) {
            this.perEmailWindowSeconds = perEmailWindowSeconds;
        }

        public int getPerEmailMinIntervalSeconds() {
            return perEmailMinIntervalSeconds;
        }

        public void setPerEmailMinIntervalSeconds(int perEmailMinIntervalSeconds) {
            this.perEmailMinIntervalSeconds = perEmailMinIntervalSeconds;
        }
    }

    public static class Delivery {
        private String mode;

        public String getMode() {
            return mode;
        }

        public void setMode(String mode) {
            this.mode = mode;
        }
    }

    public static class Supabase {
        private String url;
        private String serviceRoleKey;
        private String inviteRedirectTo;
        private String magicLinkRedirectTo;
        private String passwordRecoveryRedirectTo;

        public String getUrl() {
            return url;
        }

        public void setUrl(String url) {
            this.url = url;
        }

        public String getServiceRoleKey() {
            return serviceRoleKey;
        }

        public void setServiceRoleKey(String serviceRoleKey) {
            this.serviceRoleKey = serviceRoleKey;
        }

        public String getInviteRedirectTo() {
            return inviteRedirectTo;
        }

        public void setInviteRedirectTo(String inviteRedirectTo) {
            this.inviteRedirectTo = inviteRedirectTo;
        }

        public String getMagicLinkRedirectTo() {
            return magicLinkRedirectTo;
        }

        public void setMagicLinkRedirectTo(String magicLinkRedirectTo) {
            this.magicLinkRedirectTo = magicLinkRedirectTo;
        }

        public String getPasswordRecoveryRedirectTo() {
            return passwordRecoveryRedirectTo;
        }

        public void setPasswordRecoveryRedirectTo(String passwordRecoveryRedirectTo) {
            this.passwordRecoveryRedirectTo = passwordRecoveryRedirectTo;
        }
    }

    public static class Security {
        private final Jwt jwt = new Jwt();
        private final Cors cors = new Cors();

        public Jwt getJwt() {
            return jwt;
        }

        public Cors getCors() {
            return cors;
        }
    }

    public static class Jwt {
        private String issuerUri;
        private String localIssuer;
        private String localSecret;

        public String getIssuerUri() {
            return issuerUri;
        }

        public void setIssuerUri(String issuerUri) {
            this.issuerUri = issuerUri;
        }

        public String getLocalIssuer() {
            return localIssuer;
        }

        public void setLocalIssuer(String localIssuer) {
            this.localIssuer = localIssuer;
        }

        public String getLocalSecret() {
            return localSecret;
        }

        public void setLocalSecret(String localSecret) {
            this.localSecret = localSecret;
        }
    }

    public static class Cors {
        private String allowedOrigins;

        public String getAllowedOrigins() {
            return allowedOrigins;
        }

        public void setAllowedOrigins(String allowedOrigins) {
            this.allowedOrigins = allowedOrigins;
        }
    }

    public static class Bootstrap {
        private final Admin admin = new Admin();

        public Admin getAdmin() {
            return admin;
        }
    }

    public static class Storage {
        private final TicketAttachments ticketAttachments = new TicketAttachments();
        private final ProfileImages profileImages = new ProfileImages();

        public TicketAttachments getTicketAttachments() {
            return ticketAttachments;
        }

        public ProfileImages getProfileImages() {
            return profileImages;
        }
    }

    public static class TicketAttachments {
        private String bucket = "ticket-attachments";
        private boolean publicBucket = true;
        private long fileSizeLimitBytes = 10 * 1024 * 1024;

        public String getBucket() {
            return bucket;
        }

        public void setBucket(String bucket) {
            this.bucket = bucket;
        }

        public boolean isPublicBucket() {
            return publicBucket;
        }

        public void setPublicBucket(boolean publicBucket) {
            this.publicBucket = publicBucket;
        }

        public long getFileSizeLimitBytes() {
            return fileSizeLimitBytes;
        }

        public void setFileSizeLimitBytes(long fileSizeLimitBytes) {
            this.fileSizeLimitBytes = fileSizeLimitBytes;
        }
    }

    public static class Admin {
        private String email;
        private String fullName;
        private String password;

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }

        public String getFullName() {
            return fullName;
        }

        public void setFullName(String fullName) {
            this.fullName = fullName;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String password) {
            this.password = password;
        }

        public String fullNameOrDefault(String defaultValue) {
            return hasText(fullName) ? fullName.trim() : defaultValue;
        }

        private boolean hasText(String value) {
            return value != null && !value.isBlank();
        }
    }

    public static class ProfileImages {
        private String bucket = "profile-images";
        private long maxSizeBytes = 2 * 1024 * 1024;

        public String getBucket() {
            return bucket;
        }

        public void setBucket(String bucket) {
            this.bucket = bucket;
        }

        public long getMaxSizeBytes() {
            return maxSizeBytes;
        }

        public void setMaxSizeBytes(long maxSizeBytes) {
            this.maxSizeBytes = maxSizeBytes;
        }
    }

    public static class Notifications {
        private final Email email = new Email();

        public Email getEmail() {
            return email;
        }
    }

    public static class Email {
        private boolean enabled;
        private String from = "no-reply@smartcampus.local";
        private String actionBaseUrl = "http://localhost:3000";
        private int retryMaxAttempts = 3;
        private int retryDelaySeconds = 300;
        private int batchSize = 25;

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public String getFrom() {
            return from;
        }

        public void setFrom(String from) {
            this.from = from;
        }

        public String getActionBaseUrl() {
            return actionBaseUrl;
        }

        public void setActionBaseUrl(String actionBaseUrl) {
            this.actionBaseUrl = actionBaseUrl;
        }

        public int getRetryMaxAttempts() {
            return retryMaxAttempts;
        }

        public void setRetryMaxAttempts(int retryMaxAttempts) {
            this.retryMaxAttempts = retryMaxAttempts;
        }

        public int getRetryDelaySeconds() {
            return retryDelaySeconds;
        }

        public void setRetryDelaySeconds(int retryDelaySeconds) {
            this.retryDelaySeconds = retryDelaySeconds;
        }

        public int getBatchSize() {
            return batchSize;
        }

        public void setBatchSize(int batchSize) {
            this.batchSize = batchSize;
        }
    }
}
