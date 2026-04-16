package org.example.executionservice.dto;

import org.example.executionservice.entity.TestExecution;
import java.time.LocalDate;

public class TestStatisticsDTO {
    public interface TestStatusCount {
        TestExecution.TestStatus getStatus();
        Long getCount();
    }
    public interface TestStatusHistory {
        LocalDate getExecuted_At();  // Better for date-only values
        Long getSuccess_count();
        Long getTotal_count();
    }
}
