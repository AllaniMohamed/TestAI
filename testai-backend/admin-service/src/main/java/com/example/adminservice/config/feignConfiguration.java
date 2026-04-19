package com.example.adminservice.config;
import feign.Request;
import feign.RequestInterceptor;
import feign.RequestTemplate;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Configuration
public class feignConfiguration {
    @Bean
    public Request.Options options(){
        return new Request.Options(
                10000, 300000
        );
    }

    @Bean
    public RequestInterceptor bearerTokenRequestInterceptor() {
        return new RequestInterceptor() {
            @Override
            public void apply(RequestTemplate requestTemplate) {
                // 1. Récupérer le contexte de la requête HTTP entrante
                ServletRequestAttributes requestAttributes =
                        (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();

                if (requestAttributes != null) {
                    HttpServletRequest request = requestAttributes.getRequest();

                    // 2. Récupérer le header "Authorization" de la requête entrante
                    String authHeader = request.getHeader("Authorization");

                    // 3. Si le header existe et commence par "Bearer ", l'ajouter à la requête Feign
                    if (authHeader != null && authHeader.startsWith("Bearer ")) {
                        requestTemplate.header("Authorization", authHeader);
                    }
                }
            }
        };
    }
}

