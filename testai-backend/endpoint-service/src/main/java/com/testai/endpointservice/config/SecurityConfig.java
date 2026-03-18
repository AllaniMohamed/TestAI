package com.testai.endpointservice.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Configuration de sécurité pour endpoint-service
 *
 * VERSION TEST : Tous les endpoints publics (sans JWT)
 *
 * ⚠️ IMPORTANT : PAS DE CORS ICI !
 * CORS est géré uniquement dans la Gateway (CorsGlobalConfiguration)
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // Désactiver CSRF
                .csrf(AbstractHttpConfigurer::disable)

                // ⚠️ PAS DE CORS ICI - géré par la Gateway

                // Session stateless
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )

                // ========================================
                // TOUS LES ENDPOINTS PUBLICS (POUR TEST)
                // ========================================
                .authorizeHttpRequests(auth -> auth
                        .anyRequest().permitAll()
                );

        return http.build();
    }

    // ⚠️ PAS DE corsConfigurationSource() ICI
}










































