package org.example.userservice.dto;

import lombok.Data;

@Data
public class SendVerificationEmailRequest {
    private String toEmail;
    private String userName;
    private String token;
}