package com.example.adminservice.controller;

import com.example.adminservice.dto.UserDTO;
import com.example.adminservice.feignclient.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {
    private final StatsControllerClient statsControllerClient;
    private final UserServiceClient userServiceClient;

    // USERS
    @GetMapping("/users")
    public ResponseEntity<List<UserDTO>> getAllUsers(){
        return ResponseEntity.ok(userServiceClient.getAllUsers());
    }

    @PutMapping("/users/{userId}/{isActive}")
    public ResponseEntity<Map<String,String>> setActive(@PathVariable UUID userId, @PathVariable Boolean isActive){
        return ResponseEntity.ok(userServiceClient.setActive(userId, isActive));
    }

    // STATS
    @GetMapping("/stats/{userId}/execution-global-stats")
    public ResponseEntity<Map<String,Long>> getUserProjectsGlobalStats(@PathVariable UUID userId){
        return ResponseEntity.ok(statsControllerClient.getUserProjectsGlobalStats(userId));
    }

    @GetMapping("/stats/{userId}/global-tests-rate")
    public ResponseEntity<Map<String, Map<String, Long>>> getUserProjectsGlobalTestsRate(@PathVariable UUID userId){
        return ResponseEntity.ok(statsControllerClient.getUserProjectsGlobalTestsRate(userId));
    }

    @GetMapping("/stats/{userId}/latest-project-execs")
    public ResponseEntity<List<Map<String, String>>> getUserProjectsLatestExecs(@PathVariable UUID userId){
        return ResponseEntity.ok(statsControllerClient.getUserProjectsLatestExecs(userId));
    }
}
