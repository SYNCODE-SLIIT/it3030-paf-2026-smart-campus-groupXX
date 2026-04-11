package com.university.smartcampus;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import javax.crypto.spec.SecretKeySpec;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtDecoders;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.util.StringUtils;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, CorsConfigurationSource corsConfigurationSource) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/health", "/api/auth/login-link/request").permitAll()
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()));

        return http.build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(SmartCampusProperties properties) {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(parseCsv(properties.getSecurity().getCors().getAllowedOrigins()));
        configuration.setAllowedMethods(List.of("GET", "POST", "PATCH", "PUT", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    JwtDecoder jwtDecoder(SmartCampusProperties properties) {
        SmartCampusProperties.Jwt jwtProperties = properties.getSecurity().getJwt();
        String issuerUri = jwtProperties.getIssuerUri();
        JwtDecoder localDecoder = null;
        JwtDecoder issuerDecoder = null;

        if (StringUtils.hasText(jwtProperties.getLocalSecret())) {
            localDecoder = NimbusJwtDecoder.withSecretKey(
                new SecretKeySpec(jwtProperties.getLocalSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256")
            ).build();
        }

        if (!StringUtils.hasText(issuerUri) && StringUtils.hasText(properties.getAuth().getSupabase().getUrl())) {
            issuerUri = trimTrailingSlash(properties.getAuth().getSupabase().getUrl()) + "/auth/v1";
        }

        if (StringUtils.hasText(issuerUri)) {
            issuerDecoder = lazyIssuerDecoder(issuerUri);
        }

        if (localDecoder != null && issuerDecoder != null) {
            JwtDecoder finalLocalDecoder = localDecoder;
            JwtDecoder finalIssuerDecoder = issuerDecoder;
            return token -> {
                try {
                    return finalLocalDecoder.decode(token);
                } catch (JwtException ignored) {
                    return finalIssuerDecoder.decode(token);
                }
            };
        }

        if (localDecoder != null) {
            return localDecoder;
        }

        if (issuerDecoder != null) {
            return issuerDecoder;
        }

        return token -> {
            throw new JwtException("JWT decoder is not configured.");
        };
    }

    private List<String> parseCsv(String csv) {
        if (!StringUtils.hasText(csv)) {
            return List.of("http://localhost:3000");
        }

        return Arrays.stream(csv.split(","))
            .map(String::trim)
            .filter(StringUtils::hasText)
            .toList();
    }

    private String trimTrailingSlash(String input) {
        return input.endsWith("/") ? input.substring(0, input.length() - 1) : input;
    }

    private JwtDecoder lazyIssuerDecoder(String issuerUri) {
        AtomicReference<JwtDecoder> delegate = new AtomicReference<>();
        return token -> {
            JwtDecoder resolved = delegate.updateAndGet(existing ->
                existing != null ? existing : JwtDecoders.fromIssuerLocation(issuerUri)
            );
            return resolved.decode(token);
        };
    }
}
