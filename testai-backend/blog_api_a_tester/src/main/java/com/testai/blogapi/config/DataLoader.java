package com.testai.blogapi.config;

import com.testai.blogapi.entity.*;
import com.testai.blogapi.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataLoader implements CommandLineRunner {

    private final CategoryRepository categoryRepository;
    private final TagRepository tagRepository;
    private final ArticleRepository articleRepository;
    private final CommentRepository commentRepository;

    @Override
    public void run(String... args) {
        log.info("📚 Chargement des données de test...");

        // Catégories
        Category tech = categoryRepository.save(Category.builder()
                .name("Technology")
                .description("Articles sur les technologies")
                .build());

        Category travel = categoryRepository.save(Category.builder()
                .name("Travel")
                .description("Guides et récits de voyage")
                .build());

        Category food = categoryRepository.save(Category.builder()
                .name("Food")
                .description("Recettes et gastronomie")
                .build());

        // Tags
        Tag java = tagRepository.save(Tag.builder().name("java").build());
        Tag springBoot = tagRepository.save(Tag.builder().name("spring-boot").build());
        Tag tutorial = tagRepository.save(Tag.builder().name("tutorial").build());
        Tag adventure = tagRepository.save(Tag.builder().name("adventure").build());

        // Articles
        Article article1 = articleRepository.save(Article.builder()
                .title("Introduction to Spring Boot 3")
                .content("Spring Boot 3 is the latest major release... This comprehensive guide covers all new features including native compilation, observability improvements, and Jakarta EE 9+ support.")
                .excerpt("Learn about the new features in Spring Boot 3")
                .author("Alice Johnson")
                .status(Article.ArticleStatus.PUBLISHED)
                .publishedAt(LocalDateTime.now().minusDays(5))
                .category(tech)
                .tags(Arrays.asList(java, springBoot, tutorial))
                .build());

        Article article2 = articleRepository.save(Article.builder()
                .title("Exploring the Alps: A Complete Guide")
                .content("The Alps offer breathtaking landscapes and unforgettable experiences. From skiing in winter to hiking in summer, discover the best destinations and activities.")
                .excerpt("Complete travel guide for the Alps")
                .author("Bob Martin")
                .status(Article.ArticleStatus.PUBLISHED)
                .publishedAt(LocalDateTime.now().minusDays(2))
                .category(travel)
                .tags(List.of(adventure))
                .build());

        Article article3 = articleRepository.save(Article.builder()
                .title("10 Quick and Healthy Breakfast Recipes")
                .content("Start your day right with these delicious and nutritious breakfast ideas...")
                .excerpt("Quick breakfast recipes for busy mornings")
                .author("Carol Davis")
                .status(Article.ArticleStatus.DRAFT)
                .category(food)
                .tags(List.of())
                .build());

        // Commentaires
        commentRepository.save(Comment.builder()
                .content("Great article! Very informative.")
                .authorName("John Doe")
                .authorEmail("john@example.com")
                .article(article1)
                .approved(true)
                .build());

        commentRepository.save(Comment.builder()
                .content("Thanks for sharing this guide!")
                .authorName("Jane Smith")
                .authorEmail("jane@example.com")
                .article(article2)
                .approved(true)
                .build());

        log.info("✅ Données chargées : {} catégories, {} tags, {} articles, {} commentaires",
                categoryRepository.count(),
                tagRepository.count(),
                articleRepository.count(),
                commentRepository.count());
    }
}