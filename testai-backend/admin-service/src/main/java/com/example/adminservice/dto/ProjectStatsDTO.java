package com.example.adminservice.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class ProjectStatsDTO {
    private UUID id;
    private String name;
    private String description;
    private String projectUrl;
    private Boolean isActive;
    private Long totalTests;
    private Double successRate;

    public ProjectStatsDTO(UUID id, String name, String description, String projectUrl, Boolean isActive){
        this.id = id; this.name = name; this.description = description;
        this.projectUrl = projectUrl; this.isActive = isActive;
        setTestsRate(0L,0D);
    }

    public void setTestsRate(Long totalTests, Double successRate){
        this.totalTests = totalTests;
        this.successRate = successRate;
    }
}
