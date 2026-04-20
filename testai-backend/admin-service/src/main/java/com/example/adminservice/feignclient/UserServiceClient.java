package com.example.adminservice.feignclient;

import com.example.adminservice.config.feignConfiguration;
import com.example.adminservice.dto.UserDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@FeignClient(name = "user-service", path = "/api/users", configuration = feignConfiguration.class)
public interface UserServiceClient {
    @PutMapping("/{userId}/{isActive}")
    Map<String, String> setActive(@PathVariable UUID userId, @PathVariable Boolean isActive);

    @GetMapping
    List<UserDTO> getAllUsers();

    @DeleteMapping("/{id}")
    Map<String, String> deleteUserById(@PathVariable UUID id);
}
