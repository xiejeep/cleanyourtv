package com.gathin.tvhome;

import org.junit.Test;

import java.nio.charset.StandardCharsets;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

public class TotpTest {

    @Test
    public void rfc6238KnownVectorMatches() {
        // RFC 6238 SHA-1 test key: "12345678901234567890" -> Base32 GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ
        byte[] key = "12345678901234567890".getBytes(StandardCharsets.US_ASCII);
        // At t = 59s, counter = 1, 8-digit RFC value = 94287082 -> 6-digit = 287082
        assertEquals("287082", Totp.generateCode(key, 1L));
        assertTrue(Totp.verify("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", "2870", 59_000L));
        assertTrue(Totp.verify("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", "287082", 59_000L));
        // Within +-30s tolerance (t = 65s, counter = 2 -> counter 1 still accepted)
        assertTrue(Totp.verify("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", "2870", 65_000L));
        assertFalse(Totp.verify("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", "2871", 59_000L));
        assertFalse(Totp.verify("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", "000000", 59_000L));
    }

    @Test
    public void generatedSecretIs16Base32Chars() {
        String secret = Totp.generateSecret();
        assertEquals(16, secret.length());
        assertEquals(10, Totp.decodeBase32(secret).length);
    }
}
