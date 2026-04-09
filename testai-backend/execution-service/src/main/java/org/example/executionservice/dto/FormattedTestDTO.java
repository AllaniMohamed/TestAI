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

    private String endpointPath; // "/api/....."
    private String requestBodySchema;
    private String responseBodySchema;
    private Boolean requiresAuth;

    private List<TestExecution> tests;
    private String docMode;
    private String description;
    private String statusCodes;
    private String httpMethod;

    @Data
    public static class EndpointDetails{
        private String endpointPath;
        private String requestBodySchema;
        private String responseBodySchema;
        private Boolean requiresAuth;
        private String statusCodes;
        private String httpMethod;
    }

    public EndpointDetails getEndpoint() {
        EndpointDetails ep = new EndpointDetails();
        ep.setEndpointPath(this.endpointPath);
        ep.setRequestBodySchema(this.requestBodySchema);
        ep.setResponseBodySchema(this.responseBodySchema);
        ep.setRequiresAuth(this.requiresAuth);
        ep.setStatusCodes(this.statusCodes);
        ep.setHttpMethod(this.httpMethod);
        return ep;
    }

    public void setEndpoint(EndpointDTO ep){
        this.endpointPath = ep.getPath();
        this.requestBodySchema = ep.getRequestBodySchema();
        this.responseBodySchema = ep.getResponseBodySchema();
        this.requiresAuth = ep.getRequiresAuth();
        this.statusCodes = ep.getStatusCodes();
        this.httpMethod = ep.getMethod();
    }

    public String getEndpointCategory(){
        String temp = this.endpointPath.substring(1);
        return temp.substring(0,temp.indexOf("/"));
    }

    @Data
    public static class ProjectDetails{
        private String projectName;
        private String projectUrl;
        private String authType;
        private ApiCredentialsDTO credentials;
        private String docMode;
        private String description;
    }

    public ProjectDetails getProject() {
        ProjectDetails project = new ProjectDetails();
        project.setProjectName(this.projectName);
        project.setProjectUrl(this.projectUrl);
        project.setAuthType(this.authType);
        project.setCredentials(this.credentials);
        project.setDocMode(this.docMode);
        project.setDescription(this.description);
        return project;
    }

    public void setProject(ProjectDTO project){
        this.projectName = project.getName();
        this.projectUrl = project.getProjectUrl();
        this.authType = project.getAuthType();
        this.credentials = project.getCredentials();
        this.docMode = project.getDocMode();
        this.description = project.getDescription();
    }
}
