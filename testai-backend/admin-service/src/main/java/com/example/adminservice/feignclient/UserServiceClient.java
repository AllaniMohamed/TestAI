package com.example.adminservice.feignclient;

import com.example.adminservice.config.feignConfiguration;
import com.example.adminservice.dto.UserDTO;
import com.example.adminservice.dto.UserEntity;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@FeignClient(name = "user-service", path = "/api/users", configuration = feignConfiguration.class)
public interface UserServiceClient {
    @PostMapping("/{userId}/toggle")
    Map<String, String> toggleActive(@PathVariable UUID userId);

    @GetMapping
    List<UserDTO> getAllUsers();

    @GetMapping("/{id}/full")
    UserEntity getFullUserById(@PathVariable UUID id);

    @DeleteMapping("/{id}")
    Map<String, String> deleteUserById(@PathVariable UUID id);
}
