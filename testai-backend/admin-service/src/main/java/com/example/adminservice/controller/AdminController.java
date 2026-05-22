package com.example.adminservice.controller;

import com.example.adminservice.dto.*;
import com.example.adminservice.feignclient.*;
import com.example.adminservice.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/users")
    public ResponseEntity<List<UserDTO>> getAllUsers() {
        return ResponseEntity.ok(userServiceClient.getAllUsers());
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/users/{id}/full")
    public ResponseEntity<UserEntity> getFullUserById(@PathVariable UUID id){
        return ResponseEntity.ok(userServiceClient.getFullUserById(id));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/users/{userId}/toggle")
    public ResponseEntity<Map<String, String>> setActive(@PathVariable UUID userId) {
        return ResponseEntity.ok(userServiceClient.toggleActive(userId));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/users/{id}")
    public ResponseEntity<Map<String, String>> deleteUserById(@PathVariable UUID id){
        return ResponseEntity.ok(userServiceClient.deleteUserById(id));
    }

    // STATS
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/stats/{userId}/execution-global-stats")
    public ResponseEntity<Map<String,Long>> getUserProjectsGlobalStats(@PathVariable UUID userId){
        return ResponseEntity.ok(executionServiceClient.getUserProjectsGlobalStats(userId));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/stats/{userId}/global-tests-rate")
    public ResponseEntity<Map<String, Map<String, Long>>> getUserProjectsGlobalTestsRate(@PathVariable UUID userId){
        return ResponseEntity.ok(executionServiceClient.getUserProjectsGlobalTestsRate(userId));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/stats/{userId}/latest-project-execs")
    public ResponseEntity<List<Map<String, String>>> getUserProjectsLatestExecs(@PathVariable UUID userId){
        return ResponseEntity.ok(executionServiceClient.getUserProjectsLatestExecs(userId));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/stats/projects/all")
    public ResponseEntity<?> getAllProjectsStats(){
        try{
            return ResponseEntity.ok(adminService.getAllProjectsStats());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.toString());
        }
    }

    // REPORTS
    @PreAuthorize("hasRole('ADMIN')")
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

    @PreAuthorize("hasRole('ADMIN')")
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
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/projects/{projectId}/shares")
    public ResponseEntity<List<SharedAccessDTO>> getProjectShares(@PathVariable UUID projectId){
        return ResponseEntity.ok(projectServiceClient.getProjectShares(projectId));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/projects/{userId}/projectsIds")
    public ResponseEntity<Set<UUID>> getUserProjects(@PathVariable UUID userId){
        return ResponseEntity.ok(projectServiceClient.getUserProjects(userId));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/projects/{id}")
    public ResponseEntity<ProjectEntity> getProjectById(@PathVariable UUID id){
        return ResponseEntity.ok(projectServiceClient.getProjectById(id));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/projects/{id}")
    public ResponseEntity<Map<?,?>> deleteProjectById(@PathVariable UUID id){
        return ResponseEntity.ok(projectServiceClient.deleteProjectById(id));
    }

    // Services Health
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/health")
    public ResponseEntity<List<HealthDTO>> getServiceHealth(){
        try{
            return ResponseEntity.ok(adminService.extractServiceStatus());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ArrayList<>());
        }
    }
}
