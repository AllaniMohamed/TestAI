package com.example.adminservice.service;

import com.example.adminservice.dto.HealthDTO;
import com.example.adminservice.dto.HealthDTO.ServiceStatus;
import com.example.adminservice.dto.ProjectEntity;
import com.example.adminservice.dto.ProjectStatsDTO;
import com.example.adminservice.feignclient.ActuatorClient;
import com.example.adminservice.feignclient.ExecutionServiceClient;
import com.example.adminservice.feignclient.ProjectServiceClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class AdminService {
    @Autowired
    private ActuatorClient actuatorClient;
    @Autowired
    private ProjectServiceClient projectServiceClient;
    @Autowired
    private ExecutionServiceClient executionServiceClient;

    public List<HealthDTO> extractServiceStatus(){
        Map<String, Object> health = actuatorClient.getHealth();

        Map<String, Object> components = (Map<String, Object>) health.get("components");
        Map<String, Object> discovery = (Map<String, Object>) components.get("discoveryComposite");
        Map<String, Object> sub = (Map<String, Object>) discovery.get("components");

        // active services
        Map<String, Object> discoveryClient = (Map<String, Object>) sub.get("discoveryClient");
        Map<String, Object> details = (Map<String, Object>) discoveryClient.get("details");
        List<String> activeServices = (List<String>) details.get("services");

        // instances count
        Map<String, Object> eureka = (Map<String, Object>) sub.get("eureka");
        Map<String, Object> eurekaDetails = (Map<String, Object>) eureka.get("details");
        Map<String, Integer> applications = (Map<String, Integer>) eurekaDetails.get("applications");

        List<String> expected = List.of(
                "api-gateway",
                "admin-service",
                "project-service",
                "user-service",
                "execution-service",
                "test-service"
        );

        List<HealthDTO> result = new ArrayList<>();

        for (String service : expected) {
            boolean isUp = activeServices.contains(service);

            int instances = applications.getOrDefault(service.toUpperCase(), 0);

            HealthDTO healthDTO = new HealthDTO();
            healthDTO.setServiceName(service);
            healthDTO.setServiceStatus(isUp ? ServiceStatus.UP : ServiceStatus.DOWN);
            healthDTO.setInstancesCount(instances);

            result.add(healthDTO);
        }

        return result;
    }

    public List<ProjectStatsDTO> getAllProjectsStats(){
        try{
            List<ProjectEntity> allProjects = projectServiceClient.getAllProjects();
            List<ProjectStatsDTO> projectStats = new ArrayList<>();
            for(ProjectEntity project: allProjects){
                ProjectStatsDTO statsDTO = new ProjectStatsDTO(
                        project.getId(), project.getName(), project.getDescription(),
                        project.getProjectUrl(), project.getIsActive()
                );
                Map<String, Long> testRate = executionServiceClient.getProjectSuccessRate(project.getId());
                Long totalTests = testRate.get("TOTAL");
                Double successRate = (double) testRate.get("SUCCESS") / totalTests;
                statsDTO.setTestsRate(totalTests, successRate);
                projectStats.add(statsDTO);
            }
            return projectStats;
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
