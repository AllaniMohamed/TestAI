package org.example.gateway.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/fallback")
public class FallBackController {
    private ResponseEntity<Map<String,String>> ResponseEntityMsg(String message){
        Map<String, String> response = new HashMap<>();
        response.put("Error",message);
        return ResponseEntity
                .status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(response);
    }

    @GetMapping("/user-service")
    public ResponseEntity<Map<String,String>> userServiceFallback(){
        return ResponseEntityMsg("User Service is temporarily unavailable");
    }

    @GetMapping("/project-service")
    public ResponseEntity<Map<String,String>> projectServiceFallback(){
        return ResponseEntityMsg("Project Service is temporarily unavailable");
    }

    @GetMapping("/endpoint-service")
    public ResponseEntity<Map<String,String>> endpointServiceFallback(){
        return ResponseEntityMsg("Endpoint Service is temporarily unavailable");
    }

    @GetMapping("/auth-service")
    public ResponseEntity<Map<String,String>> authServiceFallback(){
        return ResponseEntityMsg("Authentication is temporarily unavailable");
    }

    @GetMapping("/test-service")
    public ResponseEntity<Map<String,String>> testServiceFallback(){
        return ResponseEntityMsg("Test Service is temporarily unavailable");
    }

    @GetMapping("/ai-service")
    public ResponseEntity<Map<String,String>> aiServiceFallback(){
        return ResponseEntityMsg("AI Testing Model is temporarily unavailable");
    }

    @GetMapping("/execution-service")
    public ResponseEntity<Map<String, String>> executionServiceFallback(){
        return ResponseEntityMsg("Execution Service is temporarily unavailable");
    }

    @GetMapping("/admin-service")
    public ResponseEntity<Map<String,String>> adminServiceFallback(){
        return ResponseEntityMsg("Admin Service is temporarily unavailable");
    }

    @GetMapping("/notification-service")
    public ResponseEntity<Map<String,String>> notificationServiceFallback(){
        return ResponseEntityMsg("Notification Service is temporarily unavailable");
    }
}
