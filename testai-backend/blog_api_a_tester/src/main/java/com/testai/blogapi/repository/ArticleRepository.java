package com.testai.blogapi.repository;

import com.testai.blogapi.entity.Article;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ArticleRepository extends JpaRepository<Article, Long> {
    List<Article> findByStatus(Article.ArticleStatus status);
    List<Article> findByAuthorContainingIgnoreCase(String author);
    List<Article> findByTitleContainingIgnoreCase(String title);
    List<Article> findByCategoryId(Long categoryId);
    Optional<Article> findBySlug(String slug);

    @Query("SELECT a FROM Article a JOIN a.tags t WHERE t.id = :tagId")
    List<Article> findByTagId(Long tagId);
}