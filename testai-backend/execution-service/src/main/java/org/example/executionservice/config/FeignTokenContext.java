package org.example.executionservice.config;

/**
 * ThreadLocal pour transmettre le JWT aux appels Feign
 * dans les threads @Async (où RequestContextHolder est vide).
 */
public class FeignTokenContext {

    private static final ThreadLocal<String> TOKEN = new ThreadLocal<>();

    public static void set(String token)  { TOKEN.set(token); }
    public static String get()            { return TOKEN.get(); }
    public static void clear()            { TOKEN.remove(); }
}