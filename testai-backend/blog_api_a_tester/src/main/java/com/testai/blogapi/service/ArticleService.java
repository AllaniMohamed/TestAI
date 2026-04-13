package com.testai.blogapi.service;

import com.testai.blogapi.dto.*;
import com.testai.blogapi.entity.*;
import com.testai.blogapi.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ArticleService {

    private final ArticleRepository articleRepository;
    private final CategoryRepository categoryRepository;
    private final TagRepository tagRepository;

    @Transactional
    public Article createArticle(CreateArticleRequest request) {
        Article article = Article.builder()
                .title(request.getTitle())
                .content(request.getContent())
                .excerpt(request.getExcerpt())
                .author(request.getAuthor())
                .status(request.getStatus() != null
                        ? Article.ArticleStatus.valueOf(request.getStatus())
                        : Article.ArticleStatus.DRAFT)
                .build();

        if (request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new RuntimeException("Category not found"));
            article.setCategory(category);
        }

        if (request.getTagIds() != null && !request.getTagIds().isEmpty()) {
            List<Tag> tags = tagRepository.findAllById(request.getTagIds());
            article.setTags(tags);
        }

        if (article.getStatus() == Article.ArticleStatus.PUBLISHED && article.getPublishedAt() == null) {
            article.setPublishedAt(LocalDateTime.now());
        }

        return articleRepository.save(article);
    }

    public List<Article> getAllArticles() {
        return articleRepository.findAll();
    }

    public Article getArticleById(Long id) {
        return articleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Article not found with id: " + id));
    }

    @Transactional
    public void incrementViewCount(Long id) {
        Article article = getArticleById(id);
        article.setViewCount(article.getViewCount() + 1);
        articleRepository.save(article);
    }

    public List<Article> getArticlesByStatus(String status) {
        return articleRepository.findByStatus(Article.ArticleStatus.valueOf(status));
    }

    @Transactional
    public void deleteArticle(Long id) {
        articleRepository.deleteById(id);
    }

    public ArticleDTO toDTO(Article article) {
        return ArticleDTO.builder()
                .id(article.getId())
                .title(article.getTitle())
                .slug(article.getSlug())
                .content(article.getContent())
                .excerpt(article.getExcerpt())
                .author(article.getAuthor())
                .status(article.getStatus().name())
                .viewCount(article.getViewCount())
                .publishedAt(article.getPublishedAt())
                .createdAt(article.getCreatedAt())
                .updatedAt(article.getUpdatedAt())
                .category(article.getCategory() != null
                        ? new ArticleDTO.CategorySummary(
                        article.getCategory().getId(),
                        article.getCategory().getName(),
                        article.getCategory().getSlug()
                ) : null)
                .tags(article.getTags().stream()
                        .map(tag -> new ArticleDTO.TagSummary(tag.getId(), tag.getName()))
                        .collect(Collectors.toList()))
                .commentCount(article.getComments().size())
                .build();
    }
}