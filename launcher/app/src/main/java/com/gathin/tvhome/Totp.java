package com.gathin.tvhome;

import android.graphics.Bitmap;
import android.graphics.Color;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;

import java.nio.ByteBuffer;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.EnumMap;
import java.util.Locale;
import java.util.Map;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/**
 * Standard RFC 6238 6-digit TOTP (30-second period, HMAC-SHA1) with Base32 secrets,
 * compatible with Google/Microsoft Authenticator, Apple Passwords, and Bitwarden.
 */
final class Totp {

    private static final String BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    private static final long PERIOD_MS = 30_000L;
    private static final int DIGITS = 6;
    static final int INPUT_DIGITS = 4;

    private Totp() {
    }

    static String generateSecret() {
        SecureRandom rng = new SecureRandom();
        StringBuilder sb = new StringBuilder(16);
        for (int i = 0; i < 16; i++) {
            sb.append(BASE32_ALPHABET.charAt(rng.nextInt(BASE32_ALPHABET.length())));
        }
        return sb.toString();
    }

    static String formatSecret(String secret) {
        if (secret == null) return "";
        String clean = secret.replaceAll("\\s+", "").toUpperCase(Locale.ROOT);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < clean.length(); i++) {
            if (i > 0 && i % 4 == 0) sb.append(' ');
            sb.append(clean.charAt(i));
        }
        return sb.toString();
    }

    static String otpAuthUri(String base32Secret) {
        String clean = base32Secret == null ? "" : base32Secret.replaceAll("\\s+", "").toUpperCase(Locale.ROOT);
        return "otpauth://totp/CleanYourTV:Parent?secret=" + clean
                + "&issuer=CleanYourTV&algorithm=SHA1&digits=6&period=30";
    }

    static Bitmap qrBitmap(String content, int sizePx) {
        if (content == null || content.isEmpty() || sizePx <= 0) return null;
        Map<EncodeHintType, Object> hints = new EnumMap<>(EncodeHintType.class);
        hints.put(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M);
        hints.put(EncodeHintType.MARGIN, 2);
        try {
            BitMatrix matrix = new QRCodeWriter().encode(content, BarcodeFormat.QR_CODE, sizePx, sizePx, hints);
            int w = matrix.getWidth();
            int h = matrix.getHeight();
            int[] pixels = new int[w * h];
            for (int y = 0; y < h; y++) {
                int rowOffset = y * w;
                for (int x = 0; x < w; x++) {
                    pixels[rowOffset + x] = matrix.get(x, y) ? Color.BLACK : Color.WHITE;
                }
            }
            Bitmap bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
            bmp.setPixels(pixels, 0, w, 0, 0, w, h);
            return bmp;
        } catch (WriterException e) {
            return null;
        }
    }

    static boolean verify(String base32Secret, String code, long nowMs) {
        if (base32Secret == null || code == null) return false;
        int len = code.length();
        if (len != INPUT_DIGITS && len != DIGITS) return false;
        byte[] key = decodeBase32(base32Secret);
        if (key.length == 0) return false;
        long counter = Math.floorDiv(nowMs, PERIOD_MS);
        // Allow +-1 step (+-30s) to tolerate minor clock drift between TV and phone.
        for (long delta = -1; delta <= 1; delta++) {
            String expected = generateCode(key, counter + delta);
            if (expected.length() == DIGITS && constantTimeEquals(expected.substring(0, len), code)) {
                return true;
            }
        }
        return false;
    }

    static String generateCode(byte[] key, long counter) {
        byte[] msg = ByteBuffer.allocate(8).putLong(counter).array();
        try {
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(key, "HmacSHA1"));
            byte[] hash = mac.doFinal(msg);
            int offset = hash[hash.length - 1] & 0x0F;
            int binary = ((hash[offset] & 0x7F) << 24)
                    | ((hash[offset + 1] & 0xFF) << 16)
                    | ((hash[offset + 2] & 0xFF) << 8)
                    | (hash[offset + 3] & 0xFF);
            int otp = binary % 1_000_000;
            return String.format(Locale.ROOT, "%06d", otp);
        } catch (GeneralSecurityException e) {
            return "";
        }
    }

    static byte[] decodeBase32(String input) {
        String clean = input.replaceAll("[\\s=-]", "").toUpperCase(Locale.ROOT);
        byte[] out = new byte[(clean.length() * 5) / 8];
        int buffer = 0;
        int bitsLeft = 0;
        int idx = 0;
        for (int i = 0; i < clean.length(); i++) {
            int val = BASE32_ALPHABET.indexOf(clean.charAt(i));
            if (val < 0) return new byte[0];
            buffer = (buffer << 5) | val;
            bitsLeft += 5;
            if (bitsLeft >= 8) {
                out[idx++] = (byte) ((buffer >> (bitsLeft - 8)) & 0xFF);
                bitsLeft -= 8;
            }
        }
        return out;
    }

    private static boolean constantTimeEquals(String a, String b) {
        if (a.length() != b.length()) return false;
        int diff = 0;
        for (int i = 0; i < a.length(); i++) {
            diff |= a.charAt(i) ^ b.charAt(i);
        }
        return diff == 0;
    }
}
