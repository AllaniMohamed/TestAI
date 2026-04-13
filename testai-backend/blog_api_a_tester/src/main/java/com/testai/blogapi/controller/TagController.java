package com.testai.blogapi.controller;

import com.testai.blogapi.entity.Tag;
import com.testai.blogapi.repository.TagRepository;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tags")
@RequiredArgsConstructor
@io.swagger.v3.oas.annotations.tags.Tag(name = "🔖 Tags", description = "Gestion des tags")
public class TagController {

    private final TagRepository tagRepository;

    @PostMapping
    @Operation(summary = "Créer un tag")
    public ResponseEntity<Tag> createTag(@Valid @RequestBody CreateTagRequest request) {
        Tag tag = Tag.builder()
                .name(request.getName())
                .build();

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(tagRepository.save(tag));
    }

    @GetMapping
    @Operation(summary = "Lister les tags")
    public ResponseEntity<List<Tag>> getAllTags() {
        return ResponseEntity.ok(tagRepository.findAll());
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateTagRequest {
        @NotBlank(message = "Name is required")
        @Size(min = 2, max = 30, message = "Name must be between 2 and 30 characters")
        private String name;
    }
}