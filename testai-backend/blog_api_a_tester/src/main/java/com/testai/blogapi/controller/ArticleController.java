package com.testai.blogapi.controller;

import com.testai.blogapi.dto.*;
import com.testai.blogapi.entity.Article;
import com.testai.blogapi.service.ArticleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/articles")
@RequiredArgsConstructor
@Tag(name = "📝 Articles", description = "Gestion des articles de blog")
public class ArticleController {

    private final ArticleService articleService;

    @PostMapping
    @Operation(
            summary = "Créer un article",
            description = "Crée un nouvel article de blog avec validation complète",
            responses = {
                    @ApiResponse(responseCode = "201", description = "Article créé avec succès"),
                    @ApiResponse(responseCode = "400", description = "Données invalides")
            }
    )
    public ResponseEntity<ArticleDTO> createArticle(
            @Valid @RequestBody CreateArticleRequest request
    ) {
        Article article = articleService.createArticle(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(articleService.toDTO(article));
    }

    @GetMapping
    @Operation(
            summary = "Lister tous les articles",
            description = "Récupère la liste complète des articles"
    )
    public ResponseEntity<List<ArticleDTO>> getAllArticles() {
        List<ArticleDTO> articles = articleService.getAllArticles()
                .stream()
                .map(articleService::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(articles);
    }

    @GetMapping("/{id}")
    @Operation(
            summary = "Récupérer un article",
            description = "Récupère un article par son ID et incrémente le compteur de vues",
            responses = {
                    @ApiResponse(responseCode = "200", description = "Article trouvé"),
                    @ApiResponse(responseCode = "404", description = "Article non trouvé")
            }
    )
    public ResponseEntity<ArticleDTO> getArticleById(
            @Parameter(description = "ID de l'article", example = "1")
            @PathVariable Long id
    ) {
        Article article = articleService.getArticleById(id);
        articleService.incrementViewCount(id);
        return ResponseEntity.ok(articleService.toDTO(article));
    }

    @GetMapping("/status/{status}")
    @Operation(
            summary = "Filtrer par statut",
            description = "Récupère les articles selon leur statut (DRAFT, PUBLISHED, ARCHIVED)"
    )
    public ResponseEntity<List<ArticleDTO>> getArticlesByStatus(
            @Parameter(description = "Statut", example = "PUBLISHED")
            @PathVariable String status
    ) {
        List<ArticleDTO> articles = articleService.getArticlesByStatus(status)
                .stream()
                .map(articleService::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(articles);
    }

    @DeleteMapping("/{id}")
    @Operation(
            summary = "Supprimer un article",
            description = "Supprime un article et tous ses commentaires associés",
            responses = {
                    @ApiResponse(responseCode = "204", description = "Article supprimé"),
                    @ApiResponse(responseCode = "404", description = "Article non trouvé")
            }
    )
    public ResponseEntity<Void> deleteArticle(
            @Parameter(description = "ID de l'article", example = "1")
            @PathVariable Long id
    ) {
        articleService.deleteArticle(id);
        return ResponseEntity.noContent().build();
    }
}