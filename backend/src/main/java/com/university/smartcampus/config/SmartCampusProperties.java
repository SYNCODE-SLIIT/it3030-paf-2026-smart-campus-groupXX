package com.university.smartcampus.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public class SmartCampusProperties {

    private final Auth auth = new Auth();
    private final Security security = new Security();
    private final Bootstrap bootstrap = new Bootstrap();
    private final Storage storage = new Storage();

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

    public static class Auth {
        private final Delivery delivery = new Delivery();
        private final Supabase supabase = new Supabase();

        public Delivery getDelivery() {
            return delivery;
        }

        public Supabase getSupabase() {
            return supabase;
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

    public static class Admin {
        private String email;
        private String fullName;
        private String employeeNumber;
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

        public String getEmployeeNumber() {
            return employeeNumber;
        }

        public void setEmployeeNumber(String employeeNumber) {
            this.employeeNumber = employeeNumber;
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

    public static class Storage {
        private final ProfileImages profileImages = new ProfileImages();

        public ProfileImages getProfileImages() {
            return profileImages;
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
}
