package com.example.testservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;
import java.util.List;
import java.util.UUID;

/**
 * DTO pour recevoir les informations d'un endpoint
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GenerateTestResponse {
    public String endpoint;
    public UUID endpointId;
    public UUID projectId;
    public List<Map<String, Object>> tests;
}
