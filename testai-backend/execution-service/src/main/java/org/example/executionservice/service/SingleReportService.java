package org.example.executionservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import org.example.executionservice.dto.EndpointDTO;
import org.example.executionservice.dto.FormattedTestDTO;
import org.example.executionservice.dto.ProjectDTO;
import org.example.executionservice.entity.TestExecution;
import org.example.executionservice.feignclient.EndpointServiceClient;
import org.example.executionservice.feignclient.ProjectServiceClient;
import org.example.executionservice.repository.TestExecutionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.openpdf.text.*;
import org.openpdf.text.List;
import org.openpdf.text.pdf.*;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.UUID;

@Service
public class SingleReportService {
    @Autowired
    private ProjectServiceClient projectServiceClient;
    @Autowired
    private EndpointServiceClient endpointServiceClient;
    @Autowired
    private TestExecutionRepository testExecutionRepository;

    private final ObjectMapper objectMapper = new ObjectMapper()
            .enable(SerializationFeature.INDENT_OUTPUT);

    private FormattedTestDTO getSingleEndpoint(UUID projectId, UUID endpointId){
        ProjectDTO project = projectServiceClient.getProjectById(projectId);
        EndpointDTO endpoint = endpointServiceClient.getEndpointById(endpointId);
        ArrayList<TestExecution> tests = (ArrayList<TestExecution>) testExecutionRepository.findByEndpointId(endpointId);
        tests.sort((a,b) -> b.getExecutedAt().compareTo(a.getExecutedAt()));
        FormattedTestDTO formatted = new FormattedTestDTO();
        formatted.setProject(project);
        formatted.setEndpoint(endpoint);
        formatted.setTests(tests);
        return formatted;
    }

    // ONLY THIS FUNCTION WILL BE CALLED FOR FILE GENERATION
    public byte[] reportSingleEndpoint(UUID projectId, UUID endpointId) {
        FormattedTestDTO data = getSingleEndpoint(projectId, endpointId);

        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();

            Document document = new Document(PageSize.A4, 36, 36, 50, 40);
            PdfWriter writer = PdfWriter.getInstance(document, out);
            writer.setPageEvent(new FooterPageEvent());

            document.open();

            // Fonts
            Font titleFont = new Font(Font.HELVETICA, 18, Font.BOLD, Color.BLACK);
            Font sectionFont = new Font(Font.HELVETICA, 14, Font.BOLD, new Color(33, 37, 41));
            Font subSectionFont = new Font(Font.HELVETICA, 12, Font.BOLD, new Color(52, 73, 94));
            Font labelFont = new Font(Font.HELVETICA, 10, Font.BOLD, Color.BLACK);
            Font valueFont = new Font(Font.HELVETICA, 10, Font.NORMAL, Color.BLACK);
            Font smallFont = new Font(Font.HELVETICA, 9, Font.NORMAL, Color.BLACK);
            Font codeFont = new Font(Font.COURIER, 8, Font.NORMAL, Color.BLACK);

            // =========================
            // TITLE
            // =========================
            Paragraph title = new Paragraph(
                    "Single Endpoint Test: " + safe(data.getEndpointPath()),
                    titleFont
            );
            title.setAlignment(Element.ALIGN_LEFT);
            title.setSpacingAfter(18f);
            document.add(title);

            // =========================
            // I. RELATED PROJECT
            // =========================
            addSectionTitle(document, "I. Related Project:", sectionFont);

            List projectList = new List(List.UNORDERED);
            projectList.setIndentationLeft(18f);

            projectList.add(createBulletItem("Project Name: ", safe(data.getProjectName()), labelFont, valueFont));
            projectList.add(createBulletItem("Project URL: ", safe(data.getProjectUrl()), labelFont, valueFont));
            projectList.add(createBulletItem("Authentication Type: ", safe(data.getAuthType()), labelFont, valueFont));
            projectList.add(createBulletItem("API Credentials: ", formatCredentials(data), labelFont, valueFont));

            document.add(projectList);
            document.add(Chunk.NEWLINE);

            // =========================
            // II. RELATED ENDPOINT
            // =========================
            addSectionTitle(document, "II. Related Endpoint:", sectionFont);

            Paragraph ep1 = new Paragraph();
            ep1.add(new Chunk("1. Endpoint Path: ", labelFont));
            ep1.add(new Chunk(safe(data.getEndpointPath()), valueFont));
            ep1.setSpacingAfter(6f);
            document.add(ep1);

            Paragraph ep2 = new Paragraph();
            ep2.add(new Chunk("2. Requires Auth: ", labelFont));
            ep2.add(new Chunk(String.valueOf(data.getRequiresAuth()), valueFont));
            ep2.setSpacingAfter(10f);
            document.add(ep2);

            Paragraph reqSchemaTitle = new Paragraph("3. Endpoint Request Schema:", labelFont);
            reqSchemaTitle.setSpacingAfter(4f);
            document.add(reqSchemaTitle);
            addCodeBlock(document, safeJsonText(data.getRequestBodySchema()), codeFont);

            Paragraph resSchemaTitle = new Paragraph("4. Endpoint Response Schema:", labelFont);
            resSchemaTitle.setSpacingBefore(10f);
            resSchemaTitle.setSpacingAfter(4f);
            document.add(resSchemaTitle);
            addCodeBlock(document, safeJsonText(data.getResponseBodySchema()), codeFont);

            document.add(Chunk.NEWLINE);

            // =========================
            // III. EXECUTED TESTS
            // =========================
            addSectionTitle(document, "III. Executed Tests:", sectionFont);

            if (data.getTests() == null || data.getTests().isEmpty()) {
                Paragraph noTests = new Paragraph("No executed tests found for this endpoint.", valueFont);
                noTests.setSpacingBefore(6f);
                document.add(noTests);
            } else {
                int index = 1;
                for (TestExecution test : data.getTests()) {
                    addTestExecutionBlock(document, test, index++, subSectionFont, labelFont, valueFont, smallFont, codeFont);
                }
            }

            document.close();
            return out.toByteArray();

        } catch (Exception e) {
            throw new RuntimeException("Failed to generate single endpoint PDF report", e);
        }
    }

    private void addTestExecutionBlock(
            Document document,
            TestExecution test,
            int index,
            Font subSectionFont,
            Font labelFont,
            Font valueFont,
            Font smallFont,
            Font codeFont
    ) throws Exception {

        // Outer table for boxed block
        PdfPTable wrapper = new PdfPTable(1);
        wrapper.setWidthPercentage(100);
        wrapper.setSpacingBefore(8f);
        wrapper.setSpacingAfter(12f);

        PdfPCell wrapperCell = new PdfPCell();
        wrapperCell.setPadding(10f);
        wrapperCell.setBorderColor(new Color(180, 180, 180));
        wrapperCell.setBorderWidth(1f);

        // =========================
        // Test Header
        // =========================
        Paragraph header = new Paragraph("Test #" + index, subSectionFont);
        header.setSpacingAfter(8f);
        wrapperCell.addElement(header);

        // Badge-like status line
        Paragraph statusLine = new Paragraph();
        statusLine.add(new Chunk("Final Status: ", labelFont));
        statusLine.add(new Chunk(
                safe(test.getStatus() != null ? test.getStatus().name() : "N/A"),
                new Font(Font.HELVETICA, 10, Font.BOLD, getStatusColor(test))
        ));
        statusLine.setSpacingAfter(8f);
        wrapperCell.addElement(statusLine);

        // =========================
        // Metadata
        // =========================
        Paragraph metaTitle = new Paragraph("A. Metadata", labelFont);
        metaTitle.setSpacingAfter(4f);
        wrapperCell.addElement(metaTitle);

        wrapperCell.addElement(createLine("Test ID: ", safeUuid(test.getId()), labelFont, smallFont));
        wrapperCell.addElement(createLine("Execution ID: ", safeUuid(test.getExecutionId()), labelFont, smallFont));
        wrapperCell.addElement(createLine("Executed By: ", safeUuid(test.getExecutedBy()), labelFont, smallFont));
        wrapperCell.addElement(createLine("Executed At: ", formatInstant(test.getExecutedAt()), labelFont, smallFont));
        wrapperCell.addElement(createLine("Execution Context: ", safe(test.getExecutionContext()), labelFont, smallFont));

        wrapperCell.addElement(Chunk.NEWLINE);

        // =========================
        // Test Definition
        // =========================
        Paragraph defTitle = new Paragraph("B. Test Definition", labelFont);
        defTitle.setSpacingAfter(4f);
        wrapperCell.addElement(defTitle);

        wrapperCell.addElement(createLine("HTTP Method: ", safe(test.getHttpMethod()), labelFont, valueFont));
        wrapperCell.addElement(createLine("Endpoint Path: ", safe(test.getEndpointPath()), labelFont, valueFont));
        wrapperCell.addElement(createLine("Test Type: ", safe(test.getTestType() != null ? test.getTestType().name() : null), labelFont, valueFont));
        wrapperCell.addElement(createLine("Request URL: ", safe(test.getRequestUrl()), labelFont, smallFont));

        wrapperCell.addElement(Chunk.NEWLINE);

        // =========================
        // Expected vs Actual
        // =========================
        Paragraph resultTitle = new Paragraph("C. Expected vs Actual", labelFont);
        resultTitle.setSpacingAfter(4f);
        wrapperCell.addElement(resultTitle);

        wrapperCell.addElement(createLine("Expected Status Code: ", safeInt(test.getExpectedStatusCode()), labelFont, valueFont));
        wrapperCell.addElement(createLine("Actual Status Code: ", safeInt(test.getResponseStatusCode()), labelFont, valueFont));
        wrapperCell.addElement(createLine("Status Code Match: ", safeBool(test.getStatusCodeMatch()), labelFont, valueFont));
        wrapperCell.addElement(createLine("Schema Validation Passed: ", safeBool(test.getSchemaValidationPassed()), labelFont, valueFont));
        wrapperCell.addElement(createLine("Response Time: ", safeLong(test.getResponseTimeMs()) + " ms", labelFont, valueFont));

        wrapperCell.addElement(Chunk.NEWLINE);

        // =========================
        // Request Sent
        // =========================
        Paragraph requestTitle = new Paragraph("D. Request Sent", labelFont);
        requestTitle.setSpacingAfter(4f);
        wrapperCell.addElement(requestTitle);

        wrapperCell.addElement(new Paragraph("Request Headers:", labelFont));
        wrapperCell.addElement(createCodeParagraph(prettyJson(test.getRequestHeaders()), codeFont));

        wrapperCell.addElement(new Paragraph("Request Body:", labelFont));
        wrapperCell.addElement(createCodeParagraph(prettyJson(test.getRequestBody()), codeFont));

        wrapperCell.addElement(Chunk.NEWLINE);

        // =========================
        // Response Received
        // =========================
        Paragraph responseTitle = new Paragraph("E. Response Received", labelFont);
        responseTitle.setSpacingAfter(4f);
        wrapperCell.addElement(responseTitle);

        wrapperCell.addElement(new Paragraph("Response Headers:", labelFont));
        wrapperCell.addElement(createCodeParagraph(prettyJson(test.getResponseHeaders()), codeFont));

        wrapperCell.addElement(new Paragraph("Response Body:", labelFont));
        wrapperCell.addElement(createCodeParagraph(prettyJson(test.getResponseBody()), codeFont));

        wrapperCell.addElement(Chunk.NEWLINE);

        // =========================
        // Validation / Errors
        // =========================
        Paragraph validationTitle = new Paragraph("F. Validation / Errors", labelFont);
        validationTitle.setSpacingAfter(4f);
        wrapperCell.addElement(validationTitle);

        wrapperCell.addElement(createLine("Error Message: ", safe(test.getErrorMessage()), labelFont, smallFont));

        Paragraph valErrTitle = new Paragraph("Validation Errors:", labelFont);
        valErrTitle.setSpacingBefore(4f);
        wrapperCell.addElement(valErrTitle);
        wrapperCell.addElement(createCodeParagraph(prettyJson(test.getValidationErrors()), codeFont));

        wrapper.addCell(wrapperCell);
        document.add(wrapper);
    }

    private void addSectionTitle(Document document, String text, Font font) throws DocumentException {
        Paragraph p = new Paragraph(text, font);
        p.setSpacingAfter(8f);
        document.add(p);
    }

    private ListItem createBulletItem(String label, String value, Font labelFont, Font valueFont) {
        Phrase phrase = new Phrase();
        phrase.add(new Chunk(label, labelFont));
        phrase.add(new Chunk(value, valueFont));
        return new ListItem(phrase);
    }

    private Paragraph createLine(String label, String value, Font labelFont, Font valueFont) {
        Paragraph p = new Paragraph();
        p.add(new Chunk(label, labelFont));
        p.add(new Chunk(value, valueFont));
        p.setSpacingAfter(3f);
        return p;
    }

    private void addCodeBlock(Document document, String content, Font codeFont) throws DocumentException {
        PdfPTable table = new PdfPTable(1);
        table.setWidthPercentage(100);

        PdfPCell cell = new PdfPCell(new Phrase(content, codeFont));
        cell.setPadding(8f);
        cell.setBackgroundColor(new Color(248, 249, 250));
        cell.setBorderColor(new Color(200, 200, 200));

        table.addCell(cell);
        document.add(table);
    }

    private Paragraph createCodeParagraph(String content, Font codeFont) {
        Paragraph p = new Paragraph(content, codeFont);
        p.setSpacingAfter(6f);
        return p;
    }

    private String prettyJson(Object obj) {
        try {
            if (obj == null) return "{ }";
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return String.valueOf(obj);
        }
    }

    private String safeJsonText(String raw) {
        if (raw == null || raw.isBlank()) {
            return "{ }";
        }
        try {
            Object parsed = objectMapper.readValue(raw, Object.class);
            return objectMapper.writeValueAsString(parsed);
        } catch (Exception e) {
            return raw;
        }
    }

    private String formatCredentials(FormattedTestDTO data) {
        if (data.getCredentials() == null) {
            return "N/A";
        }
        try {
            return objectMapper.writeValueAsString(data.getCredentials());
        } catch (Exception e) {
            return data.getCredentials().toString();
        }
    }

    private String formatInstant(java.time.Instant instant) {
        if (instant == null) return "N/A";
        return DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
                .withZone(ZoneId.systemDefault())
                .format(instant);
    }

    private Color getStatusColor(TestExecution test) {
        if (test == null || test.getStatus() == null) {
            return Color.DARK_GRAY;
        }

        return switch (test.getStatus()) {
            case SUCCESS -> new Color(39, 174, 96);
            case FAILED -> new Color(230, 126, 34);
            case ERROR -> new Color(192, 57, 43);
        };
    }

    private String safe(String value) {
        return (value == null || value.isBlank()) ? "N/A" : value;
    }

    private String safeUuid(UUID value) {
        return value == null ? "N/A" : value.toString();
    }

    private String safeInt(Integer value) {
        return value == null ? "N/A" : String.valueOf(value);
    }

    private String safeLong(Long value) {
        return value == null ? "N/A" : String.valueOf(value);
    }

    private String safeBool(Boolean value) {
        return value == null ? "N/A" : String.valueOf(value);
    }

    private static class FooterPageEvent extends PdfPageEventHelper {
        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            Font footerFont = new Font(Font.HELVETICA, 8, Font.NORMAL, Color.GRAY);

            ColumnText.showTextAligned(
                    writer.getDirectContent(),
                    Element.ALIGN_CENTER,
                    new Phrase("Page " + writer.getPageNumber(), footerFont),
                    (document.right() - document.left()) / 2 + document.leftMargin(),
                    document.bottom() - 15,
                    0
            );
        }
    }

}
