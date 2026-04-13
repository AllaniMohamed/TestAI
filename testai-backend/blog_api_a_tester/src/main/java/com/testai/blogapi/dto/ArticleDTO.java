package com.testai.blogapi.dto;

import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ArticleDTO {
    private Long id;
    private String title;
    private String slug;
    private String content;
    private String excerpt;
    private String author;
    private String status;
    private Integer viewCount;
    private LocalDateTime publishedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private CategorySummary category;
    private List<TagSummary> tags;
    private Integer commentCount;

    @Getter
    @Setter
    @AllArgsConstructor
    public static class CategorySummary {
        private Long id;
        private String name;
        private String slug;
    }

    @Getter
    @Setter
    @AllArgsConstructor
    public static class TagSummary {
        private Long id;
        private String name;
    }
}