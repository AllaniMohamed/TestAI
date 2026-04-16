package org.example.executionservice.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.executionservice.entity.TestExecution;
import org.example.executionservice.service.StatisticService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
@Slf4j
public class StatsController {
    private final StatisticService statisticService;

    @GetMapping("/{projectId}/success-rate")
    public ResponseEntity<Map<String, Long>> getProjectSuccessRate(@PathVariable UUID projectId){
        try{
            Map<TestExecution.TestStatus, Long> map = statisticService.getProjectSuccessRate(projectId);
            HashMap<String, Long> stringLongMap = new HashMap<>();
            Long total = 0L;
            for(Map.Entry<TestExecution.TestStatus, Long> entry: map.entrySet()){
                stringLongMap.put(entry.getKey().toString(), entry.getValue());
                total += entry.getValue();
            }
            stringLongMap.put("TOTAL",total);
            return ResponseEntity.ok(stringLongMap);
        } catch (Exception e) {
            HashMap<String, Long> error = new HashMap<>();
            error.put(e.toString(),0L);
            return ResponseEntity.badRequest().body(error);
        }
    }

    @GetMapping("/{projectId}/success-rate-history")
    public ResponseEntity<Map<String,Double>> getProjectSuccessRateHistory(@PathVariable UUID projectId){
        try{
            Map<LocalDate, Double> map = statisticService.getProjectSuccessRateHistory(projectId);
            HashMap<String, Double> stringDoubleMap = new HashMap<>();
            for(Map.Entry<LocalDate, Double> entry: map.entrySet()){
                stringDoubleMap.put(entry.getKey().toString(), entry.getValue());
            }
            return ResponseEntity.ok(stringDoubleMap);
        } catch (Exception e) {
            HashMap<String, Double> error = new HashMap<>();
            error.put(e.toString(),0D);
            return ResponseEntity.badRequest().body(error);
        }
    }
}
