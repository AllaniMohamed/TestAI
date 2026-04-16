package org.example.executionservice.service;

import org.example.executionservice.dto.TestStatisticsDTO.*;
import org.example.executionservice.entity.TestExecution;
import org.example.executionservice.repository.ProjectExecutionRepository;
import org.example.executionservice.repository.TestExecutionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class StatisticService {
    @Autowired
    private TestExecutionRepository testExecutionRepository;
    @Autowired
    private ProjectExecutionRepository projectExecutionRepository;

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
}
