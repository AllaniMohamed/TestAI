package com.testai.notificationservice.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.*;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Broker pour les messages sortants (vers le client)
        config.enableSimpleBroker("/topic", "/queue");
        // Préfixe pour les messages entrants (du client)
        config.setApplicationDestinationPrefixes("/app");
        // Préfixe pour les messages utilisateur spécifique
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS(); // Fallback SockJS pour les navigateurs qui ne supportent pas WebSocket
    }
}