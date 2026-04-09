package org.example.executionservice.util;

import com.lowagie.text.Font;

import java.awt.*;

public class pdfCommonFonts {
    public static final Font titleFont = new Font(Font.HELVETICA, 20, Font.BOLD, pdfCommonColors.SECTION_BG);
    public static final Font sectionFont = new Font(Font.HELVETICA, 14, Font.BOLD, Color.WHITE);
    public static final Font subSectionFont = new Font(Font.HELVETICA, 12, Font.BOLD, Color.WHITE);
    public static final Font labelFont = new Font(Font.HELVETICA, 9, Font.BOLD, Color.BLACK);
    public static final Font valueFont = new Font(Font.HELVETICA, 9, Font.NORMAL, Color.BLACK);
    public static final Font smallFont = new Font(Font.HELVETICA, 8, Font.NORMAL, Color.DARK_GRAY);
    public static final Font codeFont = new Font(Font.COURIER, 7, Font.NORMAL, Color.BLACK);
}
