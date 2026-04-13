package com.testai.blogapi.controller;

import com.testai.blogapi.dto.CreateCommentRequest;
import com.testai.blogapi.entity.Article;
import com.testai.blogapi.entity.Comment;
import com.testai.blogapi.repository.ArticleRepository;
import com.testai.blogapi.repository.CommentRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/comments")
@RequiredArgsConstructor
@Tag(name = "💬 Comments", description = "Gestion des commentaires")
public class CommentController {

    private final CommentRepository commentRepository;
    private final ArticleRepository articleRepository;

    @PostMapping("/article/{articleId}")
    @Operation(
            summary = "Ajouter un commentaire",
            description = "Ajoute un commentaire à un article (en attente de modération par défaut)"
    )
    public ResponseEntity<Comment> createComment(
            @Parameter(description = "ID de l'article", example = "1")
            @PathVariable Long articleId,
            @Valid @RequestBody CreateCommentRequest request
    ) {
        Article article = articleRepository.findById(articleId)
                .orElseThrow(() -> new RuntimeException("Article not found"));

        Comment comment = Comment.builder()
                .content(request.getContent())
                .authorName(request.getAuthorName())
                .authorEmail(request.getAuthorEmail())
                .article(article)
                .approved(false)
                .build();

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(commentRepository.save(comment));
    }

    @GetMapping("/article/{articleId}")
    @Operation(
            summary = "Lister les commentaires",
            description = "Récupère tous les commentaires approuvés d'un article"
    )
    public ResponseEntity<List<Comment>> getArticleComments(
            @Parameter(description = "ID de l'article", example = "1")
            @PathVariable Long articleId
    ) {
        List<Comment> comments = commentRepository
                .findByArticleIdAndApproved(articleId, true);
        return ResponseEntity.ok(comments);
    }

    @PatchMapping("/{id}/approve")
    @Operation(
            summary = "Approuver un commentaire",
            description = "Approuve un commentaire en attente de modération"
    )
    public ResponseEntity<Comment> approveComment(
            @Parameter(description = "ID du commentaire", example = "1")
            @PathVariable Long id
    ) {
        Comment comment = commentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Comment not found"));

        comment.setApproved(true);
        return ResponseEntity.ok(commentRepository.save(comment));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer un commentaire")
    public ResponseEntity<Void> deleteComment(@PathVariable Long id) {
        commentRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}