package org.example.gateway.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

/**
 * Configuration CORS Globale pour API Gateway
 *
 * Permet au frontend React (port 3000) de communiquer avec la gateway (port 8888)
 *
 * IMPORTANT : Cette configuration est pour Spring Cloud Gateway (WebFlux)
 * Ne pas confondre avec la config CORS de Spring MVC classique
 */
@Configuration
public class CorsGlobalConfiguration {

    /**
     * Configuration CORS pour tous les endpoints
     *
     * Règles :
     * - Autorise tous les domaines en développement (*)
     * - Autorise tous les headers
     * - Autorise toutes les méthodes HTTP
     * - Permet les credentials (cookies, Authorization header)
     * - Cache la config pendant 1 heure
     */
    @Bean
    public CorsWebFilter corsWebFilter() {
        CorsConfiguration corsConfig = new CorsConfiguration();

        // ========================================
        // ORIGINES AUTORISÉES
        // ========================================

        // En développement : autoriser toutes les origines
        //corsConfig.addAllowedOriginPattern("*");

        // En production : spécifier les domaines autorisés
        corsConfig.addAllowedOrigin("http://localhost:5173");
        corsConfig.addAllowedOrigin("http://localhost:5200");
        // corsConfig.addAllowedOrigin("https://testai.example.com");

        // ========================================
        // MÉTHODES HTTP AUTORISÉES
        // ========================================
        corsConfig.addAllowedMethod("GET");
        corsConfig.addAllowedMethod("POST");
        corsConfig.addAllowedMethod("PUT");
        corsConfig.addAllowedMethod("DELETE");
        corsConfig.addAllowedMethod("PATCH");
        corsConfig.addAllowedMethod("OPTIONS");
        corsConfig.addAllowedMethod("HEAD");

        // Ou simplement :
        // corsConfig.addAllowedMethod("*");

        // ========================================
        // HEADERS AUTORISÉS
        // ========================================
        corsConfig.addAllowedHeader("*");

        // Si vous voulez être plus spécifique :
        // corsConfig.addAllowedHeader("Authorization");
        // corsConfig.addAllowedHeader("Content-Type");
        // corsConfig.addAllowedHeader("Accept");
        // corsConfig.addAllowedHeader("X-Requested-With");
        // corsConfig.addAllowedHeader("X-Total-Count");

        // ========================================
        // HEADERS EXPOSÉS AU CLIENT
        // ========================================
        corsConfig.addExposedHeader("Authorization");
        corsConfig.addExposedHeader("Content-Type");
        corsConfig.addExposedHeader("X-Total-Count");
        corsConfig.addExposedHeader("X-Page-Number");
        corsConfig.addExposedHeader("X-Page-Size");

        // ========================================
        // CREDENTIALS (COOKIES + AUTHORIZATION)
        // ========================================
        corsConfig.setAllowCredentials(true);

        // ⚠️ IMPORTANT : Si allowCredentials = true,
        // vous ne pouvez PAS utiliser allowedOrigins("*")
        // Vous devez utiliser allowedOriginPatterns("*") à la place

        // ========================================
        // DURÉE DE CACHE
        // ========================================
        corsConfig.setMaxAge(3600L); // 1 heure

        // ========================================
        // APPLIQUER À TOUS LES ENDPOINTS
        // ========================================
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", corsConfig);

        return new CorsWebFilter(source);
    }
}