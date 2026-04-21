package com.example.adminservice.dto;

import lombok.Data;

@Data
public class HealthDTO {
    private String serviceName;
    private ServiceStatus serviceStatus;
    private Integer instancesCount;

    public enum ServiceStatus{
        UP, DOWN
    }
}
