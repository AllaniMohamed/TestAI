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

    @GetMapping("/execution-global-stats")
    public ResponseEntity<Map<String,Long>> getUserProjectsGlobalStats(){
        try {
            Map<String, Long> stringLongMap = statisticService.getUserProjectsGlobalStats();
            stringLongMap.put("SUCCESS", Math.round(((double)stringLongMap.get("SUCCESS") / stringLongMap.get("ALL"))*100));
            stringLongMap.put("BUGS", stringLongMap.get("ALL") - stringLongMap.get("SUCCESS"));
            return ResponseEntity.ok(stringLongMap);
        } catch (Exception e) {
            Map<String, Long> error = new HashMap<>();
            error.put(e.toString(),0L);
            return ResponseEntity.badRequest().body(error);
        }
    }

    @GetMapping("/global-tests-rate")
    public ResponseEntity<Map<String, Map<String, Long>>> getUserProjectsGlobalTestsRate(){
        try{
            Map<String, Map<String, Long>> stringLongMap = new HashMap<>();
            Map<LocalDate, Map<String, Long>> temp = statisticService.getUserProjectsTestsRate();
            for(Map.Entry<LocalDate, Map<String, Long>> entry : temp.entrySet()){
                String date = entry.getKey().toString();
                Long total = entry.getValue().get("total");
                Long success = entry.getValue().get("success");
                Map<String, Long> stringLongMap1 = new HashMap<>();
                stringLongMap1.put("total",total);
                stringLongMap1.put("success", Math.round(((double)success/total)*100));
                stringLongMap.put(date, stringLongMap1);
            }
            return ResponseEntity.ok(stringLongMap);
        } catch (Exception e) {
            Map<String, Map<String, Long>> error = new HashMap<>();
            error.put(e.toString(), new HashMap<>());
            return ResponseEntity.badRequest().body(error);
        }
    }
}
