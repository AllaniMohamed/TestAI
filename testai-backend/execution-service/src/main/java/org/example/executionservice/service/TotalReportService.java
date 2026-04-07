package org.example.executionservice.service;

import org.example.executionservice.dto.EndpointDTO;
import org.example.executionservice.dto.FormattedTestDTO;
import org.example.executionservice.dto.ProjectDTO;
import org.example.executionservice.entity.TestExecution;
import org.example.executionservice.feignclient.EndpointServiceClient;
import org.example.executionservice.feignclient.ProjectServiceClient;
import org.example.executionservice.repository.TestExecutionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class TotalReportService {
    @Autowired
    private ProjectServiceClient projectServiceClient;
    @Autowired
    private EndpointServiceClient endpointServiceClient;
    @Autowired
    private TestExecutionRepository testExecutionRepository;

    private ArrayList<FormattedTestDTO> getProjectEndpoints(UUID projectId){
        ProjectDTO project = projectServiceClient.getProjectById(projectId);
        ArrayList<EndpointDTO> endpoints = (ArrayList<EndpointDTO>) endpointServiceClient.getEndpointsByProjectId(projectId);
        ArrayList<FormattedTestDTO> formattedList = new ArrayList<>();
        for(EndpointDTO ep: endpoints){
            ArrayList<TestExecution> tests = (ArrayList<TestExecution>) testExecutionRepository.findByEndpointId(ep.getId());
            tests.sort((a,b) -> b.getExecutedAt().compareTo(a.getExecutedAt()));
            ArrayList<TestExecution> actualTests = new ArrayList<>(tests.stream()
                    .collect(Collectors.toMap(
                            TestExecution::getTestType,
                            Function.identity(),
                            (existing, replacement) ->
                                    existing.getExecutedAt().isAfter(replacement.getExecutedAt()) ? existing : replacement
                    ))
                    .values());
            FormattedTestDTO formatted = new FormattedTestDTO();
            formatted.setProject(project);
            formatted.setEndpoint(ep);
            formatted.setTests(actualTests);
            formattedList.add(formatted);
        }
        return formattedList;
    }
}
