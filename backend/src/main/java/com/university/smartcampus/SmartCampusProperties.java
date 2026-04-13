package com.university.smartcampus;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public class SmartCampusProperties {

    private final Auth auth = new Auth();
    private final Security security = new Security();
    private final Bootstrap bootstrap = new Bootstrap();

    public Auth getAuth() {
        return auth;
    }

    public Security getSecurity() {
        return security;
    }

    public Bootstrap getBootstrap() {
        return bootstrap;
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
        private String firstName;
        private String lastName;
        private String employeeNumber;
        private String department;
        private String jobTitle;
        private String password;

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }

        public String getFirstName() {
            return firstName;
        }

        public void setFirstName(String firstName) {
            this.firstName = firstName;
        }

        public String getLastName() {
            return lastName;
        }

        public void setLastName(String lastName) {
            this.lastName = lastName;
        }

        public String getEmployeeNumber() {
            return employeeNumber;
        }

        public void setEmployeeNumber(String employeeNumber) {
            this.employeeNumber = employeeNumber;
        }

        public String getDepartment() {
            return department;
        }

        public void setDepartment(String department) {
            this.department = department;
        }

        public String getJobTitle() {
            return jobTitle;
        }

        public void setJobTitle(String jobTitle) {
            this.jobTitle = jobTitle;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String password) {
            this.password = password;
        }
    }
}
