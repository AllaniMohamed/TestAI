package com.testai.projectservice.dto;

import lombok.Data;

@Data
public class ShareProjectRequest {
    private String developerEmail;
    private String accessLevel;  // "READ_ONLY" ou "READ_WRITE"
}