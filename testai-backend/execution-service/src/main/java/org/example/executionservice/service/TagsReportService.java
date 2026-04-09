package org.example.executionservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import org.example.executionservice.dto.EndpointDTO;
import org.example.executionservice.dto.FormattedTestDTO;
import org.example.executionservice.dto.FormattedTestDTO.EndpointDetails;
import org.example.executionservice.dto.ProjectDTO;
import org.example.executionservice.entity.TestExecution;
import org.example.executionservice.feignclient.EndpointServiceClient;
import org.example.executionservice.feignclient.ProjectServiceClient;
import org.example.executionservice.repository.TestExecutionRepository;
import org.example.executionservice.util.pdfCommonColors;
import org.example.executionservice.util.pdfCommonFonts;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.lowagie.text.*;
import com.lowagie.text.pdf.*;

import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import static org.example.executionservice.util.pdfFunctions.*;

@Service
public class TagsReportService {
    @Autowired
    private ProjectServiceClient projectServiceClient;
    @Autowired
    private EndpointServiceClient endpointServiceClient;
    @Autowired
    private TestExecutionRepository testExecutionRepository;

    private final ObjectMapper objectMapper = new ObjectMapper()
            .enable(SerializationFeature.INDENT_OUTPUT);

    private ArrayList<FormattedTestDTO> getProjectEndpointsByTags(UUID projectId, String tag){
        ProjectDTO project = projectServiceClient.getProjectById(projectId);
        ArrayList<EndpointDTO> endpoints = (ArrayList<EndpointDTO>) endpointServiceClient.getEndpointsByProjectIdAndTag(projectId, tag);
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

    public byte[] reportTagsReport(UUID projectId, String tag){
        ArrayList<FormattedTestDTO> data = getProjectEndpointsByTags(projectId, tag);

        try{
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            Document document = new Document(PageSize.A4, 30, 30, 40, 35);
            PdfWriter writer = PdfWriter.getInstance(document, out);
            writer.setPageEvent(new FooterPageEvent());
            document.open();

            // =========================
            // TITRE PRINCIPAL
            // =========================
            Paragraph title = new Paragraph("ENDPOINTS CATEGORY TEST REPORT", pdfCommonFonts.titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(15f);
            document.add(title);

            // Sous-titre avec path
            Paragraph subtitle = new Paragraph(
                    safe("/" + tag + " Category"),
                    new Font(Font.HELVETICA, 11, Font.BOLD, pdfCommonColors.HEADER_BG)
            );
            subtitle.setAlignment(Element.ALIGN_CENTER);
            subtitle.setSpacingAfter(20f);
            document.add(subtitle);

            // =========================
            // I. PROJECT INFORMATION (TABLEAU)
            // =========================
            addSectionHeader(document, "I. PROJECT INFORMATION", pdfCommonFonts.sectionFont);
            addProjectTable(document, data.get(0), pdfCommonFonts.labelFont, pdfCommonFonts.valueFont);

            document.add(Chunk.NEWLINE);

            addSectionHeader(document, "II. ENDPOINTS AND TESTS", pdfCommonFonts.sectionFont);
            Map<EndpointDetails, ArrayList<FormattedTestDTO>> map =
                    data.stream()
                            .collect(Collectors.groupingBy(
                                    FormattedTestDTO::getEndpoint,
                                    Collectors.toCollection(ArrayList::new)
                            ));
            int index = 1;
            for(Map.Entry<EndpointDetails, ArrayList<FormattedTestDTO>> entry: map.entrySet()){
                EndpointDetails endpoint = entry.getKey();
                ArrayList<FormattedTestDTO> tests = entry.getValue();

                addSubSectionHeader(document, index+". "+endpoint.getHttpMethod()+" "+endpoint.getEndpointPath(), pdfCommonFonts.subSectionFont);
                addEndpointTable(document, tests.get(0), pdfCommonFonts.labelFont, pdfCommonFonts.valueFont);
                // Schémas en code blocks compacts
                addSchemaBlock(document, "Request Schema:", endpoint.getRequestBodySchema(), pdfCommonFonts.labelFont, pdfCommonFonts.codeFont);
                addSchemaBlock(document, "Response Schema:", endpoint.getResponseBodySchema(), pdfCommonFonts.labelFont, pdfCommonFonts.codeFont);
                document.add(Chunk.NEWLINE);

                for(FormattedTestDTO t: tests){
                    int subIndex = 1;
                    for(TestExecution testExecution: t.getTests()){
                        addTestExecutionTableBlock(document, testExecution, subIndex++, pdfCommonFonts.labelFont, pdfCommonFonts.valueFont, pdfCommonFonts.smallFont, pdfCommonFonts.codeFont);
                    }
                }
                document.add(Chunk.NEWLINE);
                index++;
            }

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate category endpoints PDF report", e);
        }
    }
}
