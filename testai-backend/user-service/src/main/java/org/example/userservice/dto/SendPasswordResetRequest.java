package org.example.userservice.dto;

import lombok.Data;

@Data
public class SendPasswordResetRequest {
    private String toEmail;
    private String userName;
    private String resetToken;
}