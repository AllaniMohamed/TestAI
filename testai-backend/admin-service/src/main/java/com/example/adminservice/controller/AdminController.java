package com.example.adminservice.controller;

import com.example.adminservice.dto.HealthDTO;
import com.example.adminservice.dto.ProjectEntity;
import com.example.adminservice.dto.SharedAccessDTO;
import com.example.adminservice.dto.UserDTO;
import com.example.adminservice.feignclient.*;
import com.example.adminservice.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {
    private final ExecutionServiceClient executionServiceClient;
    private final UserServiceClient userServiceClient;
    private final ProjectServiceClient projectServiceClient;
    private final AdminService adminService;

    // USERS
    @GetMapping("/users")
    public ResponseEntity<List<UserDTO>> getAllUsers() {
        return ResponseEntity.ok(userServiceClient.getAllUsers());
    }

    @PutMapping("/users/{userId}/{isActive}")
    public ResponseEntity<Map<String, String>> setActive(@PathVariable UUID userId, @PathVariable Boolean isActive) {
        return ResponseEntity.ok(userServiceClient.setActive(userId, isActive));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Map<String, String>> deleteUserById(@PathVariable UUID id){
        return ResponseEntity.ok(userServiceClient.deleteUserById(id));
    }

    // STATS
    @GetMapping("/stats/{userId}/execution-global-stats")
    public ResponseEntity<Map<String,Long>> getUserProjectsGlobalStats(@PathVariable UUID userId){
        return ResponseEntity.ok(executionServiceClient.getUserProjectsGlobalStats(userId));
    }

    @GetMapping("/stats/{userId}/global-tests-rate")
    public ResponseEntity<Map<String, Map<String, Long>>> getUserProjectsGlobalTestsRate(@PathVariable UUID userId){
        return ResponseEntity.ok(executionServiceClient.getUserProjectsGlobalTestsRate(userId));
    }

    @GetMapping("/stats/{userId}/latest-project-execs")
    public ResponseEntity<List<Map<String, String>>> getUserProjectsLatestExecs(@PathVariable UUID userId){
        return ResponseEntity.ok(executionServiceClient.getUserProjectsLatestExecs(userId));
    }

    // REPORTS
    @GetMapping("/report/{projectId}")
    public ResponseEntity<?> generateProjectFullReport(@PathVariable UUID projectId){
        try {
            ResponseEntity<byte[]> pdfResponse = executionServiceClient.generateProjectFullReport(projectId);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDisposition(
                    ContentDisposition.attachment().filename("Project-"+projectId+"-report-full.pdf").build()
            );
            return ResponseEntity.ok().headers(headers).body(pdfResponse.getBody());
        }
        catch (Exception e){
            return ResponseEntity.badRequest().body(e.toString());
        }
    }

    @GetMapping("/report/{projectId}/simple")
    public ResponseEntity<?> generateProjectSimpleReport(@PathVariable UUID projectId){
        try{
            ResponseEntity<byte[]> pdfResponse = executionServiceClient.generateProjectSimpleReport(projectId);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDisposition(
                    ContentDisposition.attachment().filename("Project-"+projectId+"-report-simple.pdf").build()
            );
            return ResponseEntity.ok().headers(headers).body(pdfResponse.getBody());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.toString());
        }
    }

    // PROJECTS
    @GetMapping("/projects/{projectId}/shares")
    public ResponseEntity<List<SharedAccessDTO>> getProjectShares(@PathVariable UUID projectId){
        return ResponseEntity.ok(projectServiceClient.getProjectShares(projectId));
    }

    @GetMapping("/projects/{userId}/projectsIds")
    public ResponseEntity<Set<UUID>> getUserProjects(@PathVariable UUID userId){
        return ResponseEntity.ok(projectServiceClient.getUserProjects(userId));
    }

    @GetMapping("/projects/{id}")
    public ResponseEntity<ProjectEntity> getProjectById(@PathVariable UUID id){
        return ResponseEntity.ok(projectServiceClient.getProjectById(id));
    }

    @DeleteMapping("/projects/{id}")
    public ResponseEntity<Map<?,?>> deleteProjectById(@PathVariable UUID id){
        return ResponseEntity.ok(projectServiceClient.deleteProjectById(id));
    }

    // Services Health
    @GetMapping("/health")
    public ResponseEntity<List<HealthDTO>> getServiceHealth(){
        try{
            return ResponseEntity.ok(adminService.extractServiceStatus());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ArrayList<>());
        }
    }
}
