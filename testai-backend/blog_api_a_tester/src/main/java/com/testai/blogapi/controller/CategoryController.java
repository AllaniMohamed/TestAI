package com.testai.blogapi.controller;

import com.testai.blogapi.entity.Category;
import com.testai.blogapi.repository.CategoryRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
@Tag(name = "🏷️ Categories", description = "Gestion des catégories")
public class CategoryController {

    private final CategoryRepository categoryRepository;

    @PostMapping
    @Operation(summary = "Créer une catégorie")
    public ResponseEntity<Category> createCategory(
            @Valid @RequestBody CreateCategoryRequest request
    ) {
        Category category = Category.builder()
                .name(request.getName())
                .description(request.getDescription())
                .build();

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(categoryRepository.save(category));
    }

    @GetMapping
    @Operation(summary = "Lister les catégories")
    public ResponseEntity<List<Category>> getAllCategories() {
        return ResponseEntity.ok(categoryRepository.findAll());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Récupérer une catégorie")
    public ResponseEntity<Category> getCategoryById(@PathVariable Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Category not found"));
        return ResponseEntity.ok(category);
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateCategoryRequest {
        @NotBlank(message = "Name is required")
        @Size(min = 2, max = 50, message = "Name must be between 2 and 50 characters")
        private String name;

        @Size(max = 200, message = "Description must not exceed 200 characters")
        private String description;
    }
}