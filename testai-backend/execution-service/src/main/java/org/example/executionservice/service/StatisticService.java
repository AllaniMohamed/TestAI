package org.example.executionservice.service;

import org.example.executionservice.dto.TestStatisticsDTO.*;
import org.example.executionservice.entity.TestExecution;
import org.example.executionservice.feignclient.ProjectServiceClient;
import org.example.executionservice.repository.ProjectExecutionRepository;
import org.example.executionservice.repository.TestExecutionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class StatisticService {
    @Autowired
    private TestExecutionRepository testExecutionRepository;
    @Autowired
    private ProjectExecutionRepository projectExecutionRepository;
    @Autowired
    private ProjectServiceClient projectServiceClient;

    public Map<TestExecution.TestStatus,Long> getProjectSuccessRate(UUID projectId){
        List<TestStatusCount> stats = testExecutionRepository.findTestSuccessRate(projectId);
        return stats.stream().collect(
                Collectors.toMap(
                        TestStatusCount::getStatus, TestStatusCount::getCount
                )
        );
    }

    public Map<LocalDate, Double> getProjectSuccessRateHistory(UUID projectId) {
        List<TestStatusHistory> historyList = testExecutionRepository.findTestSuccessRateHistory(projectId);
        return historyList.stream().collect(
                Collectors.toMap(
                        TestStatusHistory::getExecuted_At,
                        history -> (history.getSuccess_count() * 100.0) / history.getTotal_count()
                )
        );
    }

    public Map<String, Long> getUserProjectsGlobalStats(){
        Set<UUID> projectIds = projectServiceClient.getUserProjects();
        long countAll = 0L;
        long countSuccess = 0L;
        for(UUID projectId: projectIds){
            countAll += testExecutionRepository.countAllByProjectId(projectId);
            countSuccess += testExecutionRepository.countAllByProjectIdAndStatus(projectId, TestExecution.TestStatus.SUCCESS);
        }
        Map<String, Long> stringLongMap = new HashMap<>();
        stringLongMap.put("ALL",countAll);
        stringLongMap.put("SUCCESS",countSuccess);
        return stringLongMap;
    }

    public Map<LocalDate, Map<String, Long>> getUserProjectsTestsRate() {
        Set<UUID> projectIds = projectServiceClient.getUserProjects();
        Map<LocalDate, Map<String, Long>> totalStats = new HashMap<>();

        for (UUID uuid : projectIds) {
            List<TestStatusHistory> historyList = testExecutionRepository.findTestSuccessRateHistory(uuid);

            for (TestStatusHistory history : historyList) {
                LocalDate date = history.getExecuted_At();

                totalStats.compute(date, (k, v) -> {
                    if (v == null) v = new HashMap<>();
                    v.merge("total", history.getTotal_count(), Long::sum);
                    v.merge("success", history.getSuccess_count(), Long::sum);
                    return v;
                });
            }
        }
        return totalStats;
    }
}
