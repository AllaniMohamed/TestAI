package com.testai.blogapi.dto;

import jakarta.validation.constraints.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateCommentRequest {

    @NotBlank(message = "Content is required")
    @Size(min = 5, max = 1000, message = "Comment must be between 5 and 1000 characters")
    private String content;

    @NotBlank(message = "Author name is required")
    @Size(min = 2, max = 100, message = "Author name must be between 2 and 100 characters")
    private String authorName;

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String authorEmail;
}