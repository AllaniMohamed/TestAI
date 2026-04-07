package org.example.executionservice.dto;

import lombok.Data;
import org.example.executionservice.entity.TestExecution;

import java.util.List;

@Data
public class FormattedTestDTO {
    private String projectName;
    private String projectUrl;
    private String authType;
    private ApiCredentialsDTO credentials;

    private String endpointPath; // "GET /api/....."
    private String requestBodySchema;
    private String responseBodySchema;
    private Boolean requiresAuth;

    private List<TestExecution> tests;

    @Data
    public static class EndpointDetails{
        private String endpointPath;
        private String requestBodySchema;
        private String responseBodySchema;
        private Boolean requiresAuth;
    }

    public EndpointDetails getEndpoint() {
        EndpointDetails ep = new EndpointDetails();
        ep.setEndpointPath(this.endpointPath);
        ep.setRequestBodySchema(this.requestBodySchema);
        ep.setResponseBodySchema(this.responseBodySchema);
        ep.setRequiresAuth(this.requiresAuth);
        return ep;
    }

    public void setEndpoint(EndpointDTO ep){
        this.endpointPath = ep.getMethod() + " " + ep.getPath();
        this.requestBodySchema = ep.getRequestBodySchema();
        this.responseBodySchema = ep.getResponseBodySchema();
        this.requiresAuth = ep.getRequiresAuth();
    }

    @Data
    public static class ProjectDetails{
        private String projectName;
        private String projectUrl;
        private String authType;
        private ApiCredentialsDTO credentials;
    }

    public ProjectDetails getProject() {
        ProjectDetails project = new ProjectDetails();
        project.setProjectName(this.projectName);
        project.setProjectUrl(this.projectUrl);
        project.setAuthType(this.authType);
        project.setCredentials(this.credentials);
        return project;
    }

    public void setProject(ProjectDTO project){
        this.projectName = project.getName();
        this.projectUrl = project.getProjectUrl();
        this.authType = project.getAuthType();
        this.credentials = project.getCredentials();
    }
}
