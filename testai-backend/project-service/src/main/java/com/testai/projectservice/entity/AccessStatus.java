package com.testai.projectservice.entity;

public enum AccessStatus {
    PENDING,   // Invitation envoyée, pas encore acceptée
    ACTIVE,    // Accès activé
    REVOKED    // Accès révoqué par le manager
}