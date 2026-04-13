package org.example.executionservice.util;

import java.util.TreeMap;

public class pdfUtils {
    private final static TreeMap<Integer, String> map = new TreeMap<Integer, String>();
    static {
        map.put(10, "X");
        map.put(9, "IX");
        map.put(5, "V");
        map.put(4, "IV");
        map.put(1, "I");
    }
    public static String toRoman(int number) {
        int l =  map.floorKey(number);
        if ( number == l ) {
            return map.get(number);
        }
        return map.get(l) + toRoman(number-l);
    }

    public static String camelToPhrase(String str) {
        if (str == null || str.isEmpty()) return str;
        String result = str.replaceAll("([A-Z])", " $1");
        if (result.length() < 1) return result;
        return result.substring(0, 1).toUpperCase() + (result.length() > 1 ? result.substring(1).trim() : "");
    }
}
