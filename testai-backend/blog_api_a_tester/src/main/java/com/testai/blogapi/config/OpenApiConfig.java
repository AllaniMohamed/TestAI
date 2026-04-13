package com.testai.blogapi.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI blogApiOpenAPI() {
        Server localServer = new Server();
        localServer.setUrl("http://localhost:9000");
        localServer.setDescription("Blog API - Local Development");

        Contact contact = new Contact();
        contact.setName("TestAI Team");
        contact.setEmail("support@testai.com");

        License license = new License()
                .name("MIT License")
                .url("https://opensource.org/licenses/MIT");

        Info info = new Info()
                .title("📝 Blog Management API")
                .version("1.0.0")
                .description("""
                        **API REST complète pour la gestion d'un blog**
                        
                        Cette API permet de :
                        - ✍️ Créer, modifier et supprimer des articles
                        - 💬 Gérer les commentaires
                        - 🏷️ Organiser avec catégories et tags
                        - 🔍 Rechercher et filtrer le contenu
                        - 📊 Obtenir des statistiques
                        
                        **Base de données:** H2 (en mémoire)  
                        **Authentification:** Aucune (API publique pour tests)
                        """)
                .contact(contact)
                .license(license);

        return new OpenAPI()
                .info(info)
                .servers(List.of(localServer));
    }
}