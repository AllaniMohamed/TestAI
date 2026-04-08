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
import com.lowagie.text.*;
import com.lowagie.text.pdf.*;

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

    // ==========================================
    // PALETTE DE COULEURS
    // ==========================================
    private static final Color HEADER_BG = new Color(41, 128, 185);        // Bleu
    private static final Color HEADER_TEXT = Color.WHITE;
    private static final Color SUCCESS_COLOR = new Color(39, 174, 96);     // Vert
    private static final Color FAILED_COLOR = new Color(231, 76, 60);      // Rouge
    private static final Color ERROR_COLOR = new Color(230, 126, 34);      // Orange
    private static final Color ROW_EVEN = new Color(248, 249, 250);        // Gris très clair
    private static final Color ROW_ODD = Color.WHITE;
    private static final Color BORDER_COLOR = new Color(189, 195, 199);    // Gris
    private static final Color SECTION_BG = new Color(52, 73, 94);         // Bleu foncé
    private static final Color CODE_BG = new Color(245, 245, 245);         // Gris clair

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

            // Fonts
            Font titleFont = new Font(Font.HELVETICA, 20, Font.BOLD, SECTION_BG);
            Font sectionFont = new Font(Font.HELVETICA, 12, Font.BOLD, Color.WHITE);
            Font labelFont = new Font(Font.HELVETICA, 9, Font.BOLD, Color.BLACK);
            Font valueFont = new Font(Font.HELVETICA, 9, Font.NORMAL, Color.BLACK);
            Font smallFont = new Font(Font.HELVETICA, 8, Font.NORMAL, Color.DARK_GRAY);
            Font codeFont = new Font(Font.COURIER, 7, Font.NORMAL, Color.BLACK);

            // =========================
            // TITRE PRINCIPAL
            // =========================
            Paragraph title = new Paragraph("SINGLE ENDPOINT TEST REPORT", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(15f);
            document.add(title);

            // Sous-titre avec path
            Paragraph subtitle = new Paragraph(
                    safe(data.getHttpMethod()) + " " + safe(data.getEndpointPath()),
                    new Font(Font.HELVETICA, 11, Font.BOLD, HEADER_BG)
            );
            subtitle.setAlignment(Element.ALIGN_CENTER);
            subtitle.setSpacingAfter(20f);
            document.add(subtitle);

            // =========================
            // I. PROJECT INFORMATION (TABLEAU)
            // =========================
            addSectionHeader(document, "I. PROJECT INFORMATION", sectionFont);
            addProjectTable(document, data, labelFont, valueFont);

            document.add(Chunk.NEWLINE);

            // =========================
            // II. ENDPOINT DETAILS (TABLEAU)
            // =========================
            addSectionHeader(document, "II. ENDPOINT DETAILS", sectionFont);
            addEndpointTable(document, data, labelFont, valueFont);

            // Schémas en code blocks compacts
            addSchemaBlock(document, "Request Schema:", data.getRequestBodySchema(), labelFont, codeFont);
            addSchemaBlock(document, "Response Schema:", data.getResponseBodySchema(), labelFont, codeFont);

            document.add(Chunk.NEWLINE);

            // =========================
            // III. TEST EXECUTIONS (TABLEAUX COMPACTS)
            // =========================
            addSectionHeader(document, "III. TEST EXECUTIONS (" + data.getTests().size() + ")", sectionFont);

            if (data.getTests() == null || data.getTests().isEmpty()) {
                Paragraph noTests = new Paragraph("No executed tests found for this endpoint.", valueFont);
                noTests.setSpacingBefore(10f);
                noTests.setAlignment(Element.ALIGN_CENTER);
                document.add(noTests);
            } else {
                int index = 1;
                for (TestExecution test : data.getTests()) {
                    addTestExecutionTableBlock(document, test, index++, labelFont, valueFont, smallFont, codeFont);
                }
            }

            document.close();
            return out.toByteArray();

        } catch (Exception e) {
            throw new RuntimeException("Failed to generate single endpoint PDF report", e);
        }
    }

    // ==========================================
    // MÉTHODES D'AJOUT DE SECTIONS
    // ==========================================

    /**
     * En-tête de section coloré
     */
    private void addSectionHeader(Document document, String title, Font font) throws DocumentException {
        PdfPTable table = new PdfPTable(1);
        table.setWidthPercentage(100);
        table.setSpacingBefore(10f);
        table.setSpacingAfter(8f);

        PdfPCell cell = new PdfPCell(new Phrase(title, font));
        cell.setBackgroundColor(SECTION_BG);
        cell.setPadding(8f);
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setHorizontalAlignment(Element.ALIGN_LEFT);

        table.addCell(cell);
        document.add(table);
    }

    /**
     * Tableau des informations du projet
     */
    private void addProjectTable(Document document, FormattedTestDTO data, Font labelFont, Font valueFont)
            throws DocumentException {
        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{30f, 70f});
        table.setSpacingAfter(5f);

        // En-tête
        addTableHeader(table, "Property", "Value");

        // Données
        addTableRow(table, "Project Name", safe(data.getProjectName()), labelFont, valueFont, true);
        addTableRow(table, "Project URL", safe(data.getProjectUrl()), labelFont, valueFont, false);
        addTableRow(table, "Auth Type", safe(data.getAuthType()), labelFont, valueFont, true);
        addTableRow(table, "Documentation Mode", safe(data.getDocMode()), labelFont, valueFont, false);

        document.add(table);
    }

    /**
     * Tableau des détails de l'endpoint
     */
    private void addEndpointTable(Document document, FormattedTestDTO data, Font labelFont, Font valueFont)
            throws DocumentException {
        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{30f, 70f});
        table.setSpacingAfter(5f);

        // En-tête
        addTableHeader(table, "Property", "Value");

        // Données
        addTableRow(table, "HTTP Method", safe(data.getHttpMethod()), labelFont, valueFont, true);
        addTableRow(table, "Endpoint Path", safe(data.getEndpointPath()), labelFont, valueFont, false);
        addTableRow(table, "Requires Auth", String.valueOf(data.getRequiresAuth()), labelFont, valueFont, true);
        addTableRow(table, "Status Codes", safe(data.getStatusCodes()), labelFont, valueFont, false);
        addTableRow(table, "Description", safe(data.getDescription()), labelFont, valueFont, true);

        document.add(table);
    }

    /**
     * Block de schéma JSON compact
     */
    private void addSchemaBlock(Document document, String title, String schema, Font labelFont, Font codeFont)
            throws DocumentException {
        Paragraph schemaTitle = new Paragraph(title, labelFont);
        schemaTitle.setSpacingBefore(8f);
        schemaTitle.setSpacingAfter(3f);
        document.add(schemaTitle);

        PdfPTable table = new PdfPTable(1);
        table.setWidthPercentage(100);

        PdfPCell cell = new PdfPCell(new Phrase(safeJsonText(schema), codeFont));
        cell.setPadding(6f);
        cell.setBackgroundColor(CODE_BG);
        cell.setBorderColor(BORDER_COLOR);
        cell.setBorderWidth(0.5f);

        table.addCell(cell);
        table.setSpacingAfter(5f);
        document.add(table);
    }

    /**
     * ⭐ Tableau compact pour un test exécuté
     */
    private void addTestExecutionTableBlock(
            Document document,
            TestExecution test,
            int index,
            Font labelFont,
            Font valueFont,
            Font smallFont,
            Font codeFont
    ) throws Exception {

        // Wrapper avec bordure
        PdfPTable wrapper = new PdfPTable(1);
        wrapper.setWidthPercentage(100);
        wrapper.setSpacingBefore(10f);
        wrapper.setSpacingAfter(5f);

        PdfPCell wrapperCell = new PdfPCell();
        wrapperCell.setPadding(0f);
        wrapperCell.setBorderColor(BORDER_COLOR);
        wrapperCell.setBorderWidth(1f);

        // =========================
        // HEADER avec badge de statut
        // =========================
        PdfPTable headerTable = new PdfPTable(2);
        headerTable.setWidthPercentage(100);
        headerTable.setWidths(new float[]{70f, 30f});

        PdfPCell titleCell = new PdfPCell(new Phrase(
                "Test #" + index + " - " + safe(test.getTestType() != null ? test.getTestType().name() : "N/A"),
                new Font(Font.HELVETICA, 10, Font.BOLD, Color.BLACK)
        ));
        titleCell.setBackgroundColor(ROW_EVEN);
        titleCell.setPadding(6f);
        titleCell.setBorder(Rectangle.BOTTOM);
        titleCell.setBorderColor(BORDER_COLOR);
        titleCell.setVerticalAlignment(Element.ALIGN_MIDDLE);

        PdfPCell statusCell = new PdfPCell(new Phrase(
                safe(test.getStatus() != null ? test.getStatus().name() : "N/A"),
                new Font(Font.HELVETICA, 9, Font.BOLD, Color.WHITE)
        ));
        statusCell.setBackgroundColor(getStatusColor(test));
        statusCell.setPadding(6f);
        statusCell.setBorder(Rectangle.BOTTOM);
        statusCell.setBorderColor(BORDER_COLOR);
        statusCell.setHorizontalAlignment(Element.ALIGN_CENTER);
        statusCell.setVerticalAlignment(Element.ALIGN_MIDDLE);

        headerTable.addCell(titleCell);
        headerTable.addCell(statusCell);
        wrapperCell.addElement(headerTable);

        // =========================
        // TABLEAU MÉTADONNÉES (2 colonnes)
        // =========================
        PdfPTable metaTable = new PdfPTable(4);
        metaTable.setWidthPercentage(100);
        metaTable.setWidths(new float[]{20f, 30f, 20f, 30f});

        addCompactRow(metaTable, "Test ID:", safeUuid(test.getId()), labelFont, smallFont);
        addCompactRow(metaTable, "Executed At:", formatInstant(test.getExecutedAt()), labelFont, smallFont);
        addCompactRow(metaTable, "Execution ID:", safeUuid(test.getExecutionId()), labelFont, smallFont);
        addCompactRow(metaTable, "Response Time:", safeLong(test.getResponseTimeMs()) + " ms", labelFont, smallFont);

        wrapperCell.addElement(metaTable);

        // =========================
        // TABLEAU RÉSULTATS (4 colonnes)
        // =========================
        PdfPTable resultsTable = new PdfPTable(4);
        resultsTable.setWidthPercentage(100);
        resultsTable.setWidths(new float[]{25f, 25f, 25f, 25f});
        resultsTable.setSpacingBefore(5f);

        addResultCell(resultsTable, "Expected Code", safeInt(test.getExpectedStatusCode()), labelFont, valueFont);
        addResultCell(resultsTable, "Actual Code", safeInt(test.getResponseStatusCode()), labelFont, valueFont);
        addResultCell(resultsTable, "Code Match", safeBool(test.getStatusCodeMatch()), labelFont, valueFont);
        addResultCell(resultsTable, "Schema Valid", safeBool(test.getSchemaValidationPassed()), labelFont, valueFont);

        wrapperCell.addElement(resultsTable);

        // =========================
        // REQUEST URL (ligne complète)
        // =========================
        PdfPTable urlTable = new PdfPTable(1);
        urlTable.setWidthPercentage(100);
        urlTable.setSpacingBefore(5f);

        PdfPCell urlCell = new PdfPCell(new Phrase("Request URL: " + safe(test.getRequestUrl()), smallFont));
        urlCell.setBackgroundColor(CODE_BG);
        urlCell.setPadding(4f);
        urlCell.setBorderColor(BORDER_COLOR);
        urlCell.setBorderWidth(0.5f);

        urlTable.addCell(urlCell);
        wrapperCell.addElement(urlTable);

        // =========================
        // REQUEST & RESPONSE (2 colonnes)
        // =========================
        PdfPTable dataTable = new PdfPTable(2);
        dataTable.setWidthPercentage(100);
        dataTable.setWidths(new float[]{50f, 50f});
        dataTable.setSpacingBefore(5f);

        // Colonne REQUEST
        PdfPCell requestCol = new PdfPCell();
        requestCol.setPadding(5f);
        requestCol.setBorderColor(BORDER_COLOR);
        requestCol.setBorderWidth(0.5f);

        Paragraph reqTitle = new Paragraph("REQUEST", new Font(Font.HELVETICA, 8, Font.BOLD, HEADER_BG));
        reqTitle.setSpacingAfter(3f);
        requestCol.addElement(reqTitle);

        requestCol.addElement(createMiniCodeBlock("Headers:", prettyJsonMini(test.getRequestHeaders()), labelFont, codeFont));
        requestCol.addElement(createMiniCodeBlock("Body:", prettyJsonMini(test.getRequestBody()), labelFont, codeFont));

        // Colonne RESPONSE
        PdfPCell responseCol = new PdfPCell();
        responseCol.setPadding(5f);
        responseCol.setBorderColor(BORDER_COLOR);
        responseCol.setBorderWidth(0.5f);

        Paragraph resTitle = new Paragraph("RESPONSE", new Font(Font.HELVETICA, 8, Font.BOLD, SUCCESS_COLOR));
        resTitle.setSpacingAfter(3f);
        responseCol.addElement(resTitle);

        responseCol.addElement(createMiniCodeBlock("Headers:", prettyJsonMini(test.getResponseHeaders()), labelFont, codeFont));
        responseCol.addElement(createMiniCodeBlock("Body:", prettyJsonMini(test.getResponseBody()), labelFont, codeFont));

        dataTable.addCell(requestCol);
        dataTable.addCell(responseCol);
        wrapperCell.addElement(dataTable);

        // =========================
        // ERREURS (si présentes)
        // =========================
        if (test.getErrorMessage() != null || test.getValidationErrors() != null) {
            PdfPTable errorTable = new PdfPTable(1);
            errorTable.setWidthPercentage(100);
            errorTable.setSpacingBefore(5f);

            PdfPCell errorCell = new PdfPCell();
            errorCell.setBackgroundColor(new Color(255, 243, 243));
            errorCell.setPadding(5f);
            errorCell.setBorderColor(FAILED_COLOR);
            errorCell.setBorderWidth(1f);

            Paragraph errorTitle = new Paragraph("ERRORS", new Font(Font.HELVETICA, 8, Font.BOLD, FAILED_COLOR));
            errorTitle.setSpacingAfter(3f);
            errorCell.addElement(errorTitle);

            if (test.getErrorMessage() != null) {
                Paragraph errMsg = new Paragraph("Error: " + safe(test.getErrorMessage()), smallFont);
                errorCell.addElement(errMsg);
            }

            if (test.getValidationErrors() != null) {
                Paragraph valErrs = new Paragraph("Validation: " + prettyJsonMini(test.getValidationErrors()), codeFont);
                errorCell.addElement(valErrs);
            }

            errorTable.addCell(errorCell);
            wrapperCell.addElement(errorTable);
        }

        wrapper.addCell(wrapperCell);
        document.add(wrapper);
    }

    // ==========================================
    // HELPERS POUR TABLEAUX
    // ==========================================

    /**
     * Ajouter en-tête de tableau
     */
    private void addTableHeader(PdfPTable table, String col1, String col2) {
        Font headerFont = new Font(Font.HELVETICA, 9, Font.BOLD, HEADER_TEXT);

        PdfPCell cell1 = new PdfPCell(new Phrase(col1, headerFont));
        cell1.setBackgroundColor(HEADER_BG);
        cell1.setPadding(6f);
        cell1.setBorder(Rectangle.NO_BORDER);

        PdfPCell cell2 = new PdfPCell(new Phrase(col2, headerFont));
        cell2.setBackgroundColor(HEADER_BG);
        cell2.setPadding(6f);
        cell2.setBorder(Rectangle.NO_BORDER);

        table.addCell(cell1);
        table.addCell(cell2);
    }

    /**
     * Ajouter ligne de tableau avec alternance de couleur
     */
    private void addTableRow(PdfPTable table, String label, String value, Font labelFont, Font valueFont, boolean isEven) {
        Color bg = isEven ? ROW_EVEN : ROW_ODD;

        PdfPCell labelCell = new PdfPCell(new Phrase(label, labelFont));
        labelCell.setBackgroundColor(bg);
        labelCell.setPadding(5f);
        labelCell.setBorderColor(BORDER_COLOR);
        labelCell.setBorderWidth(0.5f);

        PdfPCell valueCell = new PdfPCell(new Phrase(value, valueFont));
        valueCell.setBackgroundColor(bg);
        valueCell.setPadding(5f);
        valueCell.setBorderColor(BORDER_COLOR);
        valueCell.setBorderWidth(0.5f);

        table.addCell(labelCell);
        table.addCell(valueCell);
    }

    /**
     * Ajouter 2 cellules (label + value) dans un tableau 4 colonnes
     */
    private void addCompactRow(PdfPTable table, String label, String value, Font labelFont, Font valueFont) {
        PdfPCell labelCell = new PdfPCell(new Phrase(label, labelFont));
        labelCell.setPadding(4f);
        labelCell.setBackgroundColor(ROW_EVEN);
        labelCell.setBorderColor(BORDER_COLOR);
        labelCell.setBorderWidth(0.5f);

        PdfPCell valueCell = new PdfPCell(new Phrase(value, valueFont));
        valueCell.setPadding(4f);
        valueCell.setBackgroundColor(Color.WHITE);
        valueCell.setBorderColor(BORDER_COLOR);
        valueCell.setBorderWidth(0.5f);

        table.addCell(labelCell);
        table.addCell(valueCell);
    }

    /**
     * Ajouter cellule de résultat avec label au-dessus de la valeur
     */
    private void addResultCell(PdfPTable table, String label, String value, Font labelFont, Font valueFont) {
        Paragraph p = new Paragraph();
        p.add(new Chunk(label + "\n", labelFont));
        p.add(new Chunk(value, valueFont));

        PdfPCell cell = new PdfPCell(p);
        cell.setPadding(5f);
        cell.setBackgroundColor(ROW_EVEN);
        cell.setBorderColor(BORDER_COLOR);
        cell.setBorderWidth(0.5f);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);

        table.addCell(cell);
    }

    /**
     * Mini block de code inline
     */
    private Paragraph createMiniCodeBlock(String title, String content, Font labelFont, Font codeFont) {
        Paragraph p = new Paragraph();
        p.add(new Chunk(title + " ", labelFont));
        p.add(new Chunk(content, codeFont));
        p.setSpacingAfter(3f);
        return p;
    }

    // ==========================================
    // HELPERS FORMATAGE
    // ==========================================

    private String prettyJson(Object obj) {
        try {
            if (obj == null) return "{ }";
            String json = objectMapper.writeValueAsString(obj);
            return json.length() > 500 ? json.substring(0, 500) + "..." : json;
        } catch (Exception e) {
            return String.valueOf(obj);
        }
    }

    private String prettyJsonMini(Object obj) {
        try {
            if (obj == null) return "{ }";
            String json = objectMapper.writeValueAsString(obj);
            return json.length() > 200 ? json.substring(0, 200) + "..." : json;
        } catch (Exception e) {
            return String.valueOf(obj);
        }
    }

    private String safeJsonText(String raw) {
        if (raw == null || raw.isBlank()) return "{ }";
        try {
            Object parsed = objectMapper.readValue(raw, Object.class);
            String json = objectMapper.writeValueAsString(parsed);
            return json.length() > 300 ? json.substring(0, 300) + "..." : json;
        } catch (Exception e) {
            return raw;
        }
    }

    private String formatInstant(java.time.Instant instant) {
        if (instant == null) return "N/A";
        return DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
                .withZone(ZoneId.systemDefault())
                .format(instant);
    }

    private Color getStatusColor(TestExecution test) {
        if (test == null || test.getStatus() == null) return Color.DARK_GRAY;
        return switch (test.getStatus()) {
            case SUCCESS -> SUCCESS_COLOR;
            case FAILED -> FAILED_COLOR;
            case ERROR -> ERROR_COLOR;
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
                    new Phrase("Page " + writer.getPageNumber() + " | Generated by TestAI", footerFont),
                    (document.right() - document.left()) / 2 + document.leftMargin(),
                    document.bottom() - 15,
                    0
            );
        }
    }
}



/*
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
import com.lowagie.text.*;
import com.lowagie.text.pdf.*;

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
 */