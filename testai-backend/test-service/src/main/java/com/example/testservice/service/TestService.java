package com.example.testservice.service;

import com.example.testservice.dto.*;
import com.example.testservice.entity.Test;
import com.example.testservice.feignclient.GenerateTestClient;
import com.example.testservice.repository.TestRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class TestService {
    @Autowired
    private TestRepository testRepository;
    @Autowired
    private GenerateTestClient generateTestClient;

    @Transactional
    public List<TestResponse> generateTests(List<EndpointDTO> endpoints){
        List<GenerateTestResponse> generatedTests = generateTestClient.generateTests(endpoints);
        List<TestResponse> response = new ArrayList<>();
        for(GenerateTestResponse gen : generatedTests){
            Test test = testRepository.findByProjectIdAndEndpointId(gen.getProjectId(),gen.getEndpointId()).orElse(new Test());
            TestResponse singleResponse = new TestResponse();
            test.setEndpointId(gen.getEndpointId());
            test.setProjectId(gen.getProjectId()); singleResponse.setProjectId(gen.getEndpointId());
            test.setEndpointPath(gen.getEndpoint()); singleResponse.setEndpointPath(gen.getEndpoint());
            List<String> categories = new ArrayList<>();
            for (Map<String, Object> singleTest: gen.getTests()){
                String category = singleTest.get("category").toString();
                switch (category){
                    case "POSITIVE":
                        test.setPositive(singleTest);
                        break;
                    case "WRONG_TYPE":
                        test.setWrongType(singleTest);
                        break;
                    case "MISSING_FIELDS":
                        test.setMissingFields(singleTest);
                        break;
                    case "VALIDATION":
                        test.setValidation(singleTest);
                        break;
                    case "BOUNDARY":
                        test.setBoundary(singleTest);
                        break;
                    case "AUTH":
                        test.setAuth(singleTest);
                        break;
                }
                categories.add(category);
            }
            singleResponse.setInsertedTests(categories);
            testRepository.save(test);
            response.add(singleResponse);
        }
        return response;
    }

    public List<Test> getAllTests(){
        return testRepository.findAll();
    }

    public List<Test> getAllTestsByProjectId(UUID projectId){
        return testRepository.findAllByProjectId(projectId).orElse(new ArrayList<>());
    }

    public Test getTestsByProjectIdAndEndpointId(UUID projectId, UUID endpointId){
        return testRepository.findByProjectIdAndEndpointId(projectId, endpointId).orElse(null);
    }

    @Transactional
    public Test updateTest(Test updatedTest){
        Test oldTest = testRepository.findById(updatedTest.getId()).orElse(null);
        if(oldTest != null){
            oldTest.setPositive(updatedTest.getPositive());
            oldTest.setValidation(updatedTest.getAuth());
            oldTest.setBoundary(updatedTest.getBoundary());
            oldTest.setMissingFields(updatedTest.getMissingFields());
            oldTest.setWrongType(updatedTest.getWrongType());
            oldTest.setAuth(updatedTest.getAuth());
            return testRepository.save(oldTest);
        }
        else{
            return null;
        }
    }

    public Map<String, String> deleteByProjectId(UUID projectId){
        Map<String, String> response = new HashMap<>();
        try{
            testRepository.deleteByProjectId(projectId);
            response.put("success", "Tests for Project " + projectId + " Deleted Successfully!!");
        }
        catch (Exception e){
            response.put("failure", e.toString());
        }
        return response;
    }

    public Map<String, String> deleteByProjectIdAndEndpointId(UUID projectId, UUID endpointId){
        Map<String, String> response = new HashMap<>();
        try{
            testRepository.deleteByProjectIdAndEndpointId(projectId, endpointId);
            response.put("success", "Tests for Endpoint " + endpointId + " in Project "+ projectId + " Deleted Successfully!!");
        }
        catch (Exception e){
            response.put("failure", e.toString());
        }
        return response;
    }
}
