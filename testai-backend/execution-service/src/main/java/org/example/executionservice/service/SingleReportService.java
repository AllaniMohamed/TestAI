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
import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import org.example.executionservice.util.*;

import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.UUID;

import static org.example.executionservice.util.pdfFunctions.*;

@Service
public class SingleReportService {
    @Autowired
    private ProjectServiceClient projectServiceClient;
    @Autowired
    private EndpointServiceClient endpointServiceClient;
    @Autowired
    private TestExecutionRepository testExecutionRepository;

    private FormattedTestDTO getSingleEndpoint(UUID projectId, UUID endpointId) {
        ProjectDTO project = projectServiceClient.getProjectById(projectId);
        EndpointDTO endpoint = endpointServiceClient.getEndpointById(endpointId);
        ArrayList<TestExecution> tests = (ArrayList<TestExecution>) testExecutionRepository.findByEndpointId(endpointId);
        tests.sort((a, b) -> b.getExecutedAt().compareTo(a.getExecutedAt()));

        FormattedTestDTO formatted = new FormattedTestDTO();
        formatted.setProject(project);
        formatted.setEndpoint(endpoint);
        formatted.setTests(tests);
        return formatted;
    }

    public byte[] reportSingleEndpoint(UUID projectId, UUID endpointId) {
        FormattedTestDTO data = getSingleEndpoint(projectId, endpointId);

        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            Document document = new Document(PageSize.A4, 30, 30, 40, 35);
            PdfWriter writer = PdfWriter.getInstance(document, out);
            writer.setPageEvent(new FooterPageEvent());
            document.open();

            // =========================
            // TITRE PRINCIPAL
            // =========================
            Paragraph title = new Paragraph("SINGLE ENDPOINT TEST REPORT", pdfFonts.titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(15f);
            document.add(title);

            // Sous-titre avec path
            Paragraph subtitle = new Paragraph(
                    safe(data.getHttpMethod()) + " " + safe(data.getEndpointPath()),
                    new Font(Font.HELVETICA, 11, Font.BOLD, pdfColors.HEADER_BG)
            );
            subtitle.setAlignment(Element.ALIGN_CENTER);
            subtitle.setSpacingAfter(20f);
            document.add(subtitle);

            // =========================
            // I. PROJECT INFORMATION (TABLEAU)
            // =========================
            addSectionHeader(document, "I. PROJECT INFORMATION", pdfFonts.sectionFont);
            addProjectTable(document, data, pdfFonts.labelFont, pdfFonts.valueFont);

            document.add(Chunk.NEWLINE);

            // =========================
            // II. ENDPOINT DETAILS (TABLEAU)
            // =========================
            addSectionHeader(document, "II. ENDPOINT DETAILS", pdfFonts.sectionFont);
            addEndpointTable(document, data, pdfFonts.labelFont, pdfFonts.valueFont);

            // Schémas en code blocks compacts
            addSchemaBlock(document, "Request Schema:", data.getRequestBodySchema(), pdfFonts.labelFont, pdfFonts.codeFont);
            addSchemaBlock(document, "Response Schema:", data.getResponseBodySchema(), pdfFonts.labelFont, pdfFonts.codeFont);

            document.add(Chunk.NEWLINE);

            // =========================
            // III. TEST EXECUTIONS (TABLEAUX COMPACTS)
            // =========================
            addSectionHeader(document, "III. TEST EXECUTIONS (" + data.getTests().size() + ")", pdfFonts.sectionFont);

            if (data.getTests() == null || data.getTests().isEmpty()) {
                Paragraph noTests = new Paragraph("No executed tests found for this endpoint.", pdfFonts.valueFont);
                noTests.setSpacingBefore(10f);
                noTests.setAlignment(Element.ALIGN_CENTER);
                document.add(noTests);
            } else {
                int index = 1;
                for (TestExecution test : data.getTests()) {
                    addTestExecutionTableBlock(document, test, index++, pdfFonts.labelFont, pdfFonts.valueFont, pdfFonts.smallFont, pdfFonts.codeFont);
                }
            }

            document.close();
            return out.toByteArray();

        } catch (Exception e) {
            throw new RuntimeException("Failed to generate single endpoint PDF report", e);
        }
    }
}