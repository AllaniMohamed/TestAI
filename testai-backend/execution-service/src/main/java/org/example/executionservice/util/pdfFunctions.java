package org.example.executionservice.util;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.*;
import org.example.executionservice.dto.FormattedTestDTO;
import org.example.executionservice.dto.ProjectStatsDTO;
import org.example.executionservice.dto.SimpleTestDTO;
import org.example.executionservice.entity.TestExecution;

import java.awt.*;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Map;
import java.util.UUID;

import static org.example.executionservice.util.pdfUtils.*;

public class pdfFunctions {
    private static final ObjectMapper objectMapper = new ObjectMapper()
            .enable(SerializationFeature.INDENT_OUTPUT);
    // ==========================================
    // MÉTHODES D'AJOUT DE SECTIONS
    // ==========================================

    /**
     * En-tête de section coloré
     */
    public static void addSectionHeader(Document document, String title, Font font) throws DocumentException {
        PdfPTable table = new PdfPTable(1);
        table.setWidthPercentage(100);
        table.setSpacingBefore(10f);
        table.setSpacingAfter(8f);

        PdfPCell cell = new PdfPCell(new Phrase(title, font));
        cell.setBackgroundColor(pdfColors.SECTION_BG);
        cell.setPadding(8f);
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setHorizontalAlignment(Element.ALIGN_LEFT);

        table.addCell(cell);
        document.add(table);
    }

    public static void addSubSectionHeader(Document document, String title, Font font) throws DocumentException {
        PdfPTable table = new PdfPTable(1);
        table.setWidthPercentage(100);
        table.setSpacingBefore(4f);
        table.setSpacingAfter(6f);

        PdfPCell cell = new PdfPCell(new Phrase(title, font));
        cell.setBackgroundColor(pdfColors.SUBSECTION_BG);
        cell.setPadding(6f);
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setHorizontalAlignment(Element.ALIGN_LEFT);

        table.addCell(cell);
        document.add(table);
    }

    /**
     * Tableau des informations du projet
     */
    public static void addProjectTable(Document document, FormattedTestDTO data, Font labelFont, Font valueFont)
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
    public static void addEndpointTable(Document document, FormattedTestDTO data, Font labelFont, Font valueFont)
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
    public static void addSchemaBlock(Document document, String title, String schema, Font labelFont, Font codeFont)
            throws DocumentException {
        Paragraph schemaTitle = new Paragraph(title, labelFont);
        schemaTitle.setSpacingBefore(8f);
        schemaTitle.setSpacingAfter(3f);
        document.add(schemaTitle);

        PdfPTable table = new PdfPTable(1);
        table.setWidthPercentage(100);

        PdfPCell cell = new PdfPCell(new Phrase(safeJsonText(schema), codeFont));
        cell.setPadding(6f);
        cell.setBackgroundColor(pdfColors.CODE_BG);
        cell.setBorderColor(pdfColors.BORDER_COLOR);
        cell.setBorderWidth(0.5f);

        table.addCell(cell);
        table.setSpacingAfter(5f);
        document.add(table);
    }

    public static void addTestExecutionTableBlock(
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
        wrapperCell.setBorderColor(pdfColors.BORDER_COLOR);
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
        titleCell.setBackgroundColor(pdfColors.ROW_EVEN);
        titleCell.setPadding(6f);
        titleCell.setBorder(com.lowagie.text.Rectangle.BOTTOM);
        titleCell.setBorderColor(pdfColors.BORDER_COLOR);
        titleCell.setVerticalAlignment(Element.ALIGN_MIDDLE);

        PdfPCell statusCell = new PdfPCell(new Phrase(
                safe(test.getStatus() != null ? test.getStatus().name() : "N/A"),
                new Font(Font.HELVETICA, 9, Font.BOLD, Color.WHITE)
        ));
        statusCell.setBackgroundColor(getStatusColor(test));
        statusCell.setPadding(6f);
        statusCell.setBorder(Rectangle.BOTTOM);
        statusCell.setBorderColor(pdfColors.BORDER_COLOR);
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
        urlCell.setBackgroundColor(pdfColors.CODE_BG);
        urlCell.setPadding(4f);
        urlCell.setBorderColor(pdfColors.BORDER_COLOR);
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
        requestCol.setBorderColor(pdfColors.BORDER_COLOR);
        requestCol.setBorderWidth(0.5f);

        Paragraph reqTitle = new Paragraph("REQUEST", new Font(Font.HELVETICA, 8, Font.BOLD, pdfColors.HEADER_BG));
        reqTitle.setSpacingAfter(3f);
        requestCol.addElement(reqTitle);

        requestCol.addElement(createMiniCodeBlock("Headers:", prettyJsonMini(test.getRequestHeaders()), labelFont, codeFont));
        requestCol.addElement(createMiniCodeBlock("Body:", prettyJsonMini(test.getRequestBody()), labelFont, codeFont));

        // Colonne RESPONSE
        PdfPCell responseCol = new PdfPCell();
        responseCol.setPadding(5f);
        responseCol.setBorderColor(pdfColors.BORDER_COLOR);
        responseCol.setBorderWidth(0.5f);

        Paragraph resTitle = new Paragraph("RESPONSE", new Font(Font.HELVETICA, 8, Font.BOLD, pdfColors.SUCCESS_COLOR));
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
            errorCell.setBorderColor(pdfColors.FAILED_COLOR);
            errorCell.setBorderWidth(1f);

            Paragraph errorTitle = new Paragraph("ERRORS", new Font(Font.HELVETICA, 8, Font.BOLD, pdfColors.FAILED_COLOR));
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
    public static void addTableHeader(PdfPTable table, String col1, String col2) {
        Font headerFont = new Font(Font.HELVETICA, 9, Font.BOLD, pdfColors.HEADER_TEXT);

        PdfPCell cell1 = new PdfPCell(new Phrase(col1, headerFont));
        cell1.setBackgroundColor(pdfColors.HEADER_BG);
        cell1.setPadding(6f);
        cell1.setBorder(Rectangle.NO_BORDER);

        PdfPCell cell2 = new PdfPCell(new Phrase(col2, headerFont));
        cell2.setBackgroundColor(pdfColors.HEADER_BG);
        cell2.setPadding(6f);
        cell2.setBorder(Rectangle.NO_BORDER);

        table.addCell(cell1);
        table.addCell(cell2);
    }

    /**
     * Ajouter ligne de tableau avec alternance de couleur
     */
    public static void addTableRow(PdfPTable table, String label, String value, Font labelFont, Font valueFont, boolean isEven) {
        Color bg = isEven ? pdfColors.ROW_EVEN : pdfColors.ROW_ODD;

        PdfPCell labelCell = new PdfPCell(new Phrase(label, labelFont));
        labelCell.setBackgroundColor(bg);
        labelCell.setPadding(5f);
        labelCell.setBorderColor(pdfColors.BORDER_COLOR);
        labelCell.setBorderWidth(0.5f);

        PdfPCell valueCell = new PdfPCell(new Phrase(value, valueFont));
        valueCell.setBackgroundColor(bg);
        valueCell.setPadding(5f);
        valueCell.setBorderColor(pdfColors.BORDER_COLOR);
        valueCell.setBorderWidth(0.5f);

        table.addCell(labelCell);
        table.addCell(valueCell);
    }

    /**
     * Ajouter en-tête de tableau simple
     */
    public static void addSimpleTableHeader(PdfPTable table, String[] cols) {
        Font headerFont = new Font(Font.HELVETICA, 9, Font.BOLD, pdfColors.HEADER_TEXT);
        for (String col: cols){
            PdfPCell cell1 = new PdfPCell(new Phrase(col, headerFont));
            cell1.setBackgroundColor(pdfColors.HEADER_BG);
            cell1.setPadding(6f);
            cell1.setBorder(Rectangle.NO_BORDER);
            table.addCell(cell1);
        }
    }

    /**
     * Ajouter ligne de tableau simple
     */
    public static void addSimpleTableRow(PdfPTable table, String[] values, Font valueFont) {
        Color bg = pdfColors.ROW_ODD;
        for(String val: values){
            PdfPCell valueCell = new PdfPCell(new Phrase(val, valueFont));
            valueCell.setBackgroundColor(bg);
            valueCell.setPadding(5f);
            valueCell.setBorderColor(pdfColors.BORDER_COLOR);
            valueCell.setBorderWidth(0.5f);
            table.addCell(valueCell);
        }
    }

    public static void addSimpleTestsTable(Document document, String[] headers, ArrayList<SimpleTestDTO> tests, Font valueFont){
        PdfPTable table = new PdfPTable(headers.length);
        table.setWidthPercentage(100);
        float[] widths = new float[headers.length];
        Arrays.fill(widths, 100f/headers.length);
        table.setWidths(widths);
        table.setSpacingAfter(5f);
        addSimpleTableHeader(table, headers);
        for(SimpleTestDTO simpleTestDTO: tests){
            String[] values = simpleTestDTO.isSimple() ? simpleTestDTO.toStringTable() : simpleTestDTO.toFullStringTable();
            addSimpleTableRow(table, values, valueFont);
        }
        document.add(table);
    }

    public static void addProjectStatsTable(Document document, ProjectStatsDTO data, Font labelFont, Font valueFont)
            throws DocumentException {
        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{30f, 70f});
        table.setSpacingAfter(5f);

        // En-tête
        addTableHeader(table, "Property", "Value");
        Map<String, String> map = data.toMap();
        // Données
        for(Map.Entry<String,String> entry: map.entrySet()){
            addTableRow(table, camelToPhrase(entry.getKey()), safe(entry.getValue()), labelFont, valueFont, true);
        }

        document.add(table);
    }

    /**
     * Ajouter 2 cellules (label + value) dans un tableau 4 colonnes
     */
    public static void addCompactRow(PdfPTable table, String label, String value, Font labelFont, Font valueFont) {
        PdfPCell labelCell = new PdfPCell(new Phrase(label, labelFont));
        labelCell.setPadding(4f);
        labelCell.setBackgroundColor(pdfColors.ROW_EVEN);
        labelCell.setBorderColor(pdfColors.BORDER_COLOR);
        labelCell.setBorderWidth(0.5f);

        PdfPCell valueCell = new PdfPCell(new Phrase(value, valueFont));
        valueCell.setPadding(4f);
        valueCell.setBackgroundColor(Color.WHITE);
        valueCell.setBorderColor(pdfColors.BORDER_COLOR);
        valueCell.setBorderWidth(0.5f);

        table.addCell(labelCell);
        table.addCell(valueCell);
    }

    /**
     * Ajouter cellule de résultat avec label au-dessus de la valeur
     */
    public static void addResultCell(PdfPTable table, String label, String value, Font labelFont, Font valueFont) {
        Paragraph p = new Paragraph();
        p.add(new Chunk(label + "\n", labelFont));
        p.add(new Chunk(value, valueFont));

        PdfPCell cell = new PdfPCell(p);
        cell.setPadding(5f);
        cell.setBackgroundColor(pdfColors.ROW_EVEN);
        cell.setBorderColor(pdfColors.BORDER_COLOR);
        cell.setBorderWidth(0.5f);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);

        table.addCell(cell);
    }

    /**
     * Mini block de code inline
     */
    public static Paragraph createMiniCodeBlock(String title, String content, Font labelFont, Font codeFont) {
        Paragraph p = new Paragraph();
        p.add(new Chunk(title + " ", labelFont));
        p.add(new Chunk(content, codeFont));
        p.setSpacingAfter(3f);
        return p;
    }

    // ==========================================
    // HELPERS FORMATAGE
    // ==========================================

    protected String prettyJson(Object obj) {
        try {
            if (obj == null) return "{ }";
            String json = objectMapper.writeValueAsString(obj);
            return json.length() > 500 ? json.substring(0, 500) + "..." : json;
        } catch (Exception e) {
            return String.valueOf(obj);
        }
    }

    public static String prettyJsonMini(Object obj) {
        try {
            if (obj == null) return "{ }";
            String json = objectMapper.writeValueAsString(obj);
            return json.length() > 200 ? json.substring(0, 200) + "..." : json;
        } catch (Exception e) {
            return String.valueOf(obj);
        }
    }

    public static String safeJsonText(String raw) {
        if (raw == null || raw.isBlank()) return "{ }";
        try {
            Object parsed = objectMapper.readValue(raw, Object.class);
            String json = objectMapper.writeValueAsString(parsed);
            return json.length() > 300 ? json.substring(0, 300) + "..." : json;
        } catch (Exception e) {
            return raw;
        }
    }

    public static String formatInstant(java.time.Instant instant) {
        if (instant == null) return "N/A";
        return DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
                .withZone(ZoneId.systemDefault())
                .format(instant);
    }

    public static Color getStatusColor(TestExecution test) {
        if (test == null || test.getStatus() == null) return Color.DARK_GRAY;
        return switch (test.getStatus()) {
            case SUCCESS -> pdfColors.SUCCESS_COLOR;
            case FAILED -> pdfColors.FAILED_COLOR;
            case ERROR -> pdfColors.ERROR_COLOR;
        };
    }

    public static String safe(String value) {
        return (value == null || value.isBlank()) ? "N/A" : value;
    }

    public static String safeUuid(UUID value) {
        return value == null ? "N/A" : value.toString();
    }

    public static String safeInt(Integer value) {
        return value == null ? "N/A" : String.valueOf(value);
    }

    public static String safeLong(Long value) {
        return value == null ? "N/A" : String.valueOf(value);
    }

    public static String safeBool(Boolean value) {
        return value == null ? "N/A" : String.valueOf(value);
    }

    public static class FooterPageEvent extends PdfPageEventHelper {
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
