package org.example.executionservice.dto;

import lombok.*;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SavedApiRequestDTO {

    private UUID id;
    private UUID userId;
    private String name;
    private String description;
    private String method;
    private String url;
    private Map<String, String> headers;
    private Map<String, String> queryParams;
    private Map<String, String> pathVariables;
    private String authType;
    private Map<String, String> authConfig;
    private String requestBody;
    private Instant createdAt;
    private Instant updatedAt;
    private Instant lastExecutedAt;
    private Integer executionCount;
}