package com.gathin.tvhome;

import android.accessibilityservice.AccessibilityService;
import android.app.Activity;
import android.app.ActivityManager;
import android.app.Dialog;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.drawable.ColorDrawable;
import android.graphics.drawable.GradientDrawable;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.provider.Settings;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.function.Consumer;
import java.util.function.Predicate;

/**
 * Per-app daily screen time limits with a floating countdown banner before expiry,
 * forced return Home + background process termination when time runs out,
 * and a 4-digit Parent PIN to set or remove restrictions.
 */
final class ScreenTime {

    static final String EXTRA_EXPIRED_LABEL = "com.gathin.tvhome.EXPIRED_LABEL";
    static final int[] PRESET_SECONDS = {0, 20, 60, 15 * 60, 30 * 60, 60 * 60, 120 * 60};
    static final int[] GO_BONUS_MINUTES_OPTIONS = {10, 30, 60};
    static final int DEFAULT_GO_BONUS_MINUTES = 30;
    static final String LOCAL_GO_GAME_URL = "local";
    static final String DEFAULT_GO_GAME_URL = LOCAL_GO_GAME_URL;

    private static final String PREFS = "screen_time";
    private static final String KEY_DAY = "day";
    private static final String KEY_PIN = "pin";
    private static final String KEY_REWARDED_LEVELS = "rewarded_levels";
    private static final String KEY_GO_GAME_URL = "go_game_url";
    private static final String KEY_GO_BONUS_MINUTES = "go_bonus_minutes";
    private static final String KEY_TOTP_ENABLED = "totp_enabled";
    private static final String KEY_TOTP_SECRET = "totp_secret";
    private static final String DEFAULT_PIN = "1234";
    private static final String PREFIX_LIMIT_SEC = "limit_sec_";
    private static final String PREFIX_LIMIT_LEGACY = "limit_";
    private static final String PREFIX_BONUS_SEC = "bonus_sec_";
    private static final String PREFIX_USED = "used_";
    private static final long TICK_MS = 1000L;
    private static final int COLOR_AMBER = 0xFFFFB74D;
    private static final int COLOR_RED = 0xFFFF5252;
    private static final String[][] KEYPAD_ROWS = {
            {"1", "2", "3", "4", "5"},
            {"6", "7", "8", "9", "0", "\u232B"}
    };

    private static final Handler HANDLER = new Handler(Looper.getMainLooper());

    private static String activePkg;
    private static long activeStartElapsed;
    private static Runnable tickRunnable;

    private static TextView overlayView;
    private static int overlayBorderColor;
    private static boolean bannerIsNotice;
    private static Runnable hideOverlayRunnable;

    private ScreenTime() {
    }

    static String getPin(Context ctx) {
        String pin = prefs(ctx).getString(KEY_PIN, DEFAULT_PIN);
        return (pin != null && pin.length() == 4) ? pin : DEFAULT_PIN;
    }

    static boolean isDefaultPin(Context ctx) {
        return !prefs(ctx).contains(KEY_PIN);
    }

    static void setPin(Context ctx, String pin) {
        if (pin == null || pin.length() != 4) return;
        prefs(ctx).edit().putString(KEY_PIN, pin).apply();
    }

    static int getLimitSeconds(Context ctx, String pkg) {
        if (pkg == null || pkg.isEmpty()) return 0;
        SharedPreferences sp = prefs(ctx);
        if (sp.contains(PREFIX_LIMIT_SEC + pkg)) {
            return Math.max(0, sp.getInt(PREFIX_LIMIT_SEC + pkg, 0));
        }
        int legacyMin = Math.max(0, sp.getInt(PREFIX_LIMIT_LEGACY + pkg, 0));
        return legacyMin * 60;
    }

    static void setLimitSeconds(Context ctx, String pkg, int seconds) {
        if (pkg == null || pkg.isEmpty()) return;
        SharedPreferences sp = prefs(ctx);
        ensureToday(sp);
        SharedPreferences.Editor ed = sp.edit();
        ed.remove(PREFIX_LIMIT_LEGACY + pkg);
        if (seconds <= 0) {
            ed.remove(PREFIX_LIMIT_SEC + pkg);
            ed.remove(PREFIX_BONUS_SEC + pkg);
        } else {
            ed.putInt(PREFIX_LIMIT_SEC + pkg, seconds);
        }
        ed.apply();
    }

    static int getBonusSeconds(Context ctx, String pkg) {
        if (pkg == null || pkg.isEmpty()) return 0;
        SharedPreferences sp = prefs(ctx);
        ensureToday(sp);
        return Math.max(0, sp.getInt(PREFIX_BONUS_SEC + pkg, 0));
    }

    static int getEffectiveLimitSeconds(Context ctx, String pkg) {
        int base = getLimitSeconds(ctx, pkg);
        if (base <= 0) return 0;
        return base + getBonusSeconds(ctx, pkg);
    }

    static Set<String> getRewardedLevels(Context ctx) {
        Set<String> saved = prefs(ctx).getStringSet(KEY_REWARDED_LEVELS, null);
        return saved == null ? new HashSet<>() : new HashSet<>(saved);
    }

    static boolean grantGoLevelBonus(Context ctx, String pkg, String levelId) {
        if (levelId == null || levelId.trim().isEmpty()) return false;
        SharedPreferences sp = prefs(ctx);
        ensureToday(sp);
        String cleanId = levelId.trim();
        Set<String> rewarded = getRewardedLevels(ctx);
        if (rewarded.contains(cleanId)) return false;
        rewarded.add(cleanId);
        SharedPreferences.Editor ed = sp.edit();
        ed.putStringSet(KEY_REWARDED_LEVELS, rewarded);
        if (pkg != null && !pkg.isEmpty()) {
            int bonusSec = getGoBonusSeconds(ctx);
            int baseLimit = getLimitSeconds(ctx, pkg);
            int prevBonus = Math.max(0, sp.getInt(PREFIX_BONUS_SEC + pkg, 0));
            int usedSec = (int) Math.ceil(Math.max(0L, sp.getLong(PREFIX_USED + pkg, 0L)) / 1000.0);
            int minBonusForWindow = Math.max(0, usedSec - baseLimit) + bonusSec;
            int newBonus = Math.max(prevBonus + bonusSec, minBonusForWindow);
            ed.putInt(PREFIX_BONUS_SEC + pkg, newBonus);
        }
        ed.apply();
        return true;
    }

    static int getGoBonusMinutes(Context ctx) {
        int m = prefs(ctx).getInt(KEY_GO_BONUS_MINUTES, DEFAULT_GO_BONUS_MINUTES);
        for (int opt : GO_BONUS_MINUTES_OPTIONS) {
            if (m == opt) return m;
        }
        return DEFAULT_GO_BONUS_MINUTES;
    }

    static int getGoBonusSeconds(Context ctx) {
        return getGoBonusMinutes(ctx) * 60;
    }

    static void setGoBonusMinutes(Context ctx, int minutes) {
        for (int opt : GO_BONUS_MINUTES_OPTIONS) {
            if (minutes == opt) {
                prefs(ctx).edit().putInt(KEY_GO_BONUS_MINUTES, minutes).apply();
                return;
            }
        }
    }

    static String getGoGameUrl(Context ctx) {
        String url = prefs(ctx).getString(KEY_GO_GAME_URL, DEFAULT_GO_GAME_URL);
        if (url == null || url.trim().isEmpty()) return DEFAULT_GO_GAME_URL;
        return url.trim();
    }

    static void setGoGameUrl(Context ctx, String url) {
        if (url == null || url.trim().isEmpty()) {
            prefs(ctx).edit().remove(KEY_GO_GAME_URL).apply();
        } else {
            prefs(ctx).edit().putString(KEY_GO_GAME_URL, url.trim()).apply();
        }
    }

    static long getUsedMs(Context ctx, String pkg) {
        if (pkg == null || pkg.isEmpty()) return 0L;
        SharedPreferences sp = prefs(ctx);
        ensureToday(sp);
        long used = Math.max(0L, sp.getLong(PREFIX_USED + pkg, 0L));
        if (pkg.equals(activePkg) && activeStartElapsed > 0L) {
            used += Math.max(0L, SystemClock.elapsedRealtime() - activeStartElapsed);
        }
        return used;
    }

    static void resetToday(Context ctx, String pkg) {
        if (pkg == null || pkg.isEmpty()) return;
        SharedPreferences sp = prefs(ctx);
        ensureToday(sp);
        sp.edit()
                .remove(PREFIX_USED + pkg)
                .remove(PREFIX_BONUS_SEC + pkg)
                .apply();
        if (pkg.equals(activePkg)) activeStartElapsed = SystemClock.elapsedRealtime();
    }

    static boolean tryLaunch(Context ctx, String pkg, String label) {
        return tryLaunch(ctx, pkg, label, null);
    }

    static boolean tryLaunch(Context ctx, String pkg, String label, Runnable retryLaunch) {
        if (pkg == null || pkg.isEmpty()) return true;
        if (pkg.equals(ctx.getPackageName())) return true;
        Context appCtx = ctx.getApplicationContext();
        String displayLabel = (label == null || label.isEmpty()) ? pkg : label;
        stopTicker();
        flush(appCtx);

        int limitSec = getEffectiveLimitSeconds(appCtx, pkg);
        long usedMs = getUsedMs(appCtx, pkg);
        long limitMs = limitSec * 1000L;
        if (limitSec > 0 && usedMs >= limitMs) {
            String msg = "\u26D4 " + displayLabel + " 今日使用时间已达上限，无法打开";
            if (!showOverlay(appCtx, msg, COLOR_RED, 3000L)) {
                Toast.makeText(appCtx, msg, Toast.LENGTH_LONG).show();
            }
            if (ctx instanceof Activity) {
                Activity activity = (Activity) ctx;
                showLimitReachedDialog(activity, pkg, displayLabel, retryLaunch);
            }
            return false;
        }

        hideOverlay(appCtx);
        activePkg = pkg;
        activeStartElapsed = SystemClock.elapsedRealtime();
        if (limitSec > 0) startTicker(appCtx, pkg, displayLabel, limitSec, limitMs);
        return true;
    }

    static void onHomeResumed(Context ctx) {
        Context appCtx = ctx.getApplicationContext();
        stopTicker();
        flush(appCtx);
        if (!bannerIsNotice) hideOverlay(appCtx);
    }

    static String menuRowTitle(Context ctx, String pkg) {
        int limitSec = getEffectiveLimitSeconds(ctx, pkg);
        if (limitSec <= 0) return "屏幕时间: 不限制";
        long usedSec = getUsedMs(ctx, pkg) / 1000L;
        int bonusMin = getBonusSeconds(ctx, pkg) / 60;
        String bonusTag = bonusMin > 0 ? " (含奖励+" + bonusMin + "分)" : "";
        if (limitSec < 60) {
            return "屏幕时间: 已用 " + usedSec + " / " + limitSec + " 秒" + bonusTag;
        }
        return "屏幕时间: 已用 " + (usedSec / 60L) + " / " + (limitSec / 60) + " 分钟" + bonusTag;
    }

    static String optionLabel(int seconds) {
        if (seconds <= 0) return "不限制";
        if (seconds == 20) return "20 秒 (快速测试)";
        if (seconds == 60) return "1 分钟 (测试)";
        return (seconds / 60) + " 分钟";
    }

    static void showLimitReachedDialog(Activity activity, String pkg, String displayLabel, Runnable retryLaunch) {
        if (activity == null || activity.isFinishing() || activity.isDestroyed()) return;
        float density = activity.getResources().getDisplayMetrics().density;
        LinearLayout panel = new LinearLayout(activity);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setBackgroundResource(R.drawable.glass_panel);
        panel.setPadding(dp(density, 26), dp(density, 24), dp(density, 26), dp(density, 22));

        TextView title = new TextView(activity);
        title.setText("今日使用时间已达上限");
        title.setTextColor(Color.WHITE);
        title.setTextSize(TypedValue.COMPLEX_UNIT_SP, 21f);
        title.setTypeface(UiFont.get(activity, R.string.font_medium));
        panel.addView(title);

        int rewardedCount = getRewardedLevels(activity).size();
        int bonusMin = getGoBonusMinutes(activity);
        TextView sub = new TextView(activity);
        sub.setText("「" + displayLabel + "」今日额度已用完（已领奖关卡: " + rewardedCount + " 关）。\n可通过围棋闯关延长 " + bonusMin + " 分钟，或输入家长密码解除限制。");
        sub.setTextColor(0xD9FFFFFF);
        sub.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f);
        sub.setTypeface(UiFont.get(activity, R.string.font_body));
        LinearLayout.LayoutParams subLp = new LinearLayout.LayoutParams(-1, -2);
        subLp.topMargin = dp(density, 8);
        subLp.bottomMargin = dp(density, 18);
        panel.addView(sub, subLp);

        final Dialog dialog = new Dialog(activity);
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE);
        dialog.setContentView(panel);
        dialog.setCanceledOnTouchOutside(true);

        TextView goBtn = makeActionButton(activity, density, "🐼 围棋闯关解锁 (+" + bonusMin + " 分钟)", () -> {
            dialog.dismiss();
            hideOverlay(activity.getApplicationContext());
            Intent goIntent = new Intent(activity, GoUnlockActivity.class)
                    .putExtra(GoUnlockActivity.EXTRA_PKG, pkg)
                    .putExtra(GoUnlockActivity.EXTRA_LABEL, displayLabel);
            activity.startActivity(goIntent);
        });
        LinearLayout.LayoutParams goLp = new LinearLayout.LayoutParams(-1, dp(density, 48));
        goLp.bottomMargin = dp(density, 10);
        panel.addView(goBtn, goLp);

        TextView pinBtn = makeActionButton(activity, density, "🔑 输入家长密码 (解除今日限制)", () -> {
            dialog.dismiss();
            showPinDialog(activity, "今日使用时间已达上限",
                    "输入家长密码可解除「" + displayLabel + "」今日限制", () -> {
                        Context appCtx = activity.getApplicationContext();
                        resetToday(appCtx, pkg);
                        hideOverlay(appCtx);
                        Toast.makeText(appCtx, "已解除今日限制", Toast.LENGTH_SHORT).show();
                        if (retryLaunch != null) retryLaunch.run();
                    });
        });
        panel.addView(pinBtn, new LinearLayout.LayoutParams(-1, dp(density, 48)));

        Window w = dialog.getWindow();
        if (w != null) {
            w.setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
            w.setLayout(dp(density, 460), ViewGroup.LayoutParams.WRAP_CONTENT);
            w.setDimAmount(0.65f);
        }
        dialog.show();
        goBtn.requestFocus();
    }

    static void showGoUrlDialog(Activity activity) {
        if (activity == null || activity.isFinishing() || activity.isDestroyed()) return;
        float density = activity.getResources().getDisplayMetrics().density;
        LinearLayout panel = new LinearLayout(activity);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setBackgroundResource(R.drawable.glass_panel);
        panel.setPadding(dp(density, 26), dp(density, 24), dp(density, 26), dp(density, 22));

        TextView title = new TextView(activity);
        title.setText("配置围棋闯关服务器地址");
        title.setTextColor(Color.WHITE);
        title.setTextSize(TypedValue.COMPLEX_UNIT_SP, 20f);
        title.setTypeface(UiFont.get(activity, R.string.font_medium));
        panel.addView(title);

        TextView sub = new TextView(activity);
        sub.setText("填 local 使用 APK 内置离线围棋；也可填局域网/公网地址（如 http://192.168.6.158:18080）。\n当前已领奖通关数: " + getRewardedLevels(activity).size() + " 关");
        sub.setTextColor(0xD9FFFFFF);
        sub.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f);
        LinearLayout.LayoutParams subLp = new LinearLayout.LayoutParams(-1, -2);
        subLp.topMargin = dp(density, 6);
        subLp.bottomMargin = dp(density, 12);
        panel.addView(sub, subLp);

        EditText input = new EditText(activity);
        input.setText(getGoGameUrl(activity));
        input.setSingleLine(true);
        input.setTextColor(Color.WHITE);
        input.setHintTextColor(0x88FFFFFF);
        input.setHint(DEFAULT_GO_GAME_URL);
        input.setPadding(dp(density, 14), dp(density, 10), dp(density, 14), dp(density, 10));
        GradientDrawable inputBg = new GradientDrawable();
        inputBg.setColor(0x22FFFFFF);
        inputBg.setCornerRadius(10f * density);
        inputBg.setStroke(dp(density, 1), 0x44FFFFFF);
        input.setBackground(inputBg);
        LinearLayout.LayoutParams inputLp = new LinearLayout.LayoutParams(-1, -2);
        inputLp.bottomMargin = dp(density, 14);
        panel.addView(input, inputLp);

        TextView rewardLabel = new TextView(activity);
        rewardLabel.setText("通关奖励时间：");
        rewardLabel.setTextColor(0xD9FFFFFF);
        rewardLabel.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f);
        LinearLayout.LayoutParams rlLp = new LinearLayout.LayoutParams(-1, -2);
        rlLp.bottomMargin = dp(density, 8);
        panel.addView(rewardLabel, rlLp);

        final int[] selectedMinutes = {getGoBonusMinutes(activity)};
        LinearLayout bonusRow = new LinearLayout(activity);
        bonusRow.setOrientation(LinearLayout.HORIZONTAL);
        TextView[] bonusBtns = new TextView[GO_BONUS_MINUTES_OPTIONS.length];
        Runnable refreshBonusBtns = () -> {
            for (int i = 0; i < GO_BONUS_MINUTES_OPTIONS.length; i++) {
                int opt = GO_BONUS_MINUTES_OPTIONS[i];
                String label = opt == 60 ? "1 小时" : (opt + " 分钟");
                bonusBtns[i].setText((opt == selectedMinutes[0] ? "✓ " : "") + label);
            }
        };
        for (int i = 0; i < GO_BONUS_MINUTES_OPTIONS.length; i++) {
            final int opt = GO_BONUS_MINUTES_OPTIONS[i];
            bonusBtns[i] = makeActionButton(activity, density, "", () -> {
                selectedMinutes[0] = opt;
                refreshBonusBtns.run();
            });
            LinearLayout.LayoutParams optLp = new LinearLayout.LayoutParams(0, dp(density, 42), 1f);
            if (i < GO_BONUS_MINUTES_OPTIONS.length - 1) optLp.setMarginEnd(dp(density, 8));
            bonusRow.addView(bonusBtns[i], optLp);
        }
        refreshBonusBtns.run();
        LinearLayout.LayoutParams brLp = new LinearLayout.LayoutParams(-1, -2);
        brLp.bottomMargin = dp(density, 16);
        panel.addView(bonusRow, brLp);

        final Dialog dialog = new Dialog(activity);
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE);
        dialog.setContentView(panel);
        dialog.setCanceledOnTouchOutside(true);

        LinearLayout actions = new LinearLayout(activity);
        actions.setOrientation(LinearLayout.HORIZONTAL);
        TextView localBtn = makeActionButton(activity, density, "内置离线", () -> input.setText(LOCAL_GO_GAME_URL));
        TextView saveBtn = makeActionButton(activity, density, "保存", () -> {
            setGoGameUrl(activity, input.getText().toString());
            setGoBonusMinutes(activity, selectedMinutes[0]);
            String durLabel = selectedMinutes[0] == 60 ? "1 小时" : (selectedMinutes[0] + " 分钟");
            Toast.makeText(activity, "已保存（" + durLabel + "）：" + getGoGameUrl(activity), Toast.LENGTH_SHORT).show();
            dialog.dismiss();
        });
        TextView cancelBtn = makeActionButton(activity, density, "取消", dialog::dismiss);
        LinearLayout.LayoutParams bLp1 = new LinearLayout.LayoutParams(0, dp(density, 44), 1f);
        bLp1.setMarginEnd(dp(density, 8));
        LinearLayout.LayoutParams bLp2 = new LinearLayout.LayoutParams(0, dp(density, 44), 1f);
        bLp2.setMarginEnd(dp(density, 8));
        actions.addView(localBtn, bLp1);
        actions.addView(saveBtn, bLp2);
        actions.addView(cancelBtn, new LinearLayout.LayoutParams(0, dp(density, 44), 1f));
        panel.addView(actions);

        Window w = dialog.getWindow();
        if (w != null) {
            w.setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
            w.setLayout(dp(density, 500), ViewGroup.LayoutParams.WRAP_CONTENT);
            w.setDimAmount(0.65f);
        }
        dialog.show();
        saveBtn.requestFocus();
    }

    private static TextView makeActionButton(Activity activity, float density, String text, Runnable onClick) {
        TextView btn = new TextView(activity);
        btn.setText(text);
        btn.setGravity(Gravity.CENTER);
        btn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f);
        btn.setTypeface(UiFont.get(activity, R.string.font_medium));
        btn.setFocusable(true);
        btn.setFocusableInTouchMode(true);
        btn.setClickable(true);
        styleKeyButton(btn, density, false);
        btn.setOnFocusChangeListener((v, focused) -> styleKeyButton(btn, density, focused));
        btn.setOnClickListener(v -> onClick.run());
        return btn;
    }

    static boolean isTotpEnabled(Context ctx) {
        return prefs(ctx).getBoolean(KEY_TOTP_ENABLED, false);
    }

    static void setTotpEnabled(Context ctx, boolean enabled) {
        prefs(ctx).edit().putBoolean(KEY_TOTP_ENABLED, enabled).apply();
    }

    static String getOrCreateTotpSecret(Context ctx) {
        SharedPreferences sp = prefs(ctx);
        String secret = sp.getString(KEY_TOTP_SECRET, null);
        if (secret == null || secret.length() < 16) {
            secret = Totp.generateSecret();
            sp.edit().putString(KEY_TOTP_SECRET, secret).apply();
        }
        return secret;
    }

    static String resetTotpSecret(Context ctx) {
        String secret = Totp.generateSecret();
        prefs(ctx).edit().putString(KEY_TOTP_SECRET, secret).apply();
        return secret;
    }

    static void showTotpSetupDialog(Activity activity) {
        if (activity == null || activity.isFinishing() || activity.isDestroyed()) return;
        float density = activity.getResources().getDisplayMetrics().density;
        LinearLayout panel = new LinearLayout(activity);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setBackgroundResource(R.drawable.glass_panel);
        panel.setPadding(dp(density, 26), dp(density, 24), dp(density, 26), dp(density, 22));

        TextView title = new TextView(activity);
        title.setText("开启动态口令 (TOTP)");
        title.setTextColor(Color.WHITE);
        title.setTextSize(TypedValue.COMPLEX_UNIT_SP, 20f);
        title.setTypeface(UiFont.get(activity, R.string.font_medium));
        panel.addView(title);

        TextView sub = new TextView(activity);
        sub.setText("用 Microsoft Authenticator / Google Authenticator 扫描下方二维码（或手动输入密钥），每 30 秒变化一次；开启后静态密码失效。");
        sub.setTextColor(0xD9FFFFFF);
        sub.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f);
        LinearLayout.LayoutParams subLp = new LinearLayout.LayoutParams(-1, -2);
        subLp.topMargin = dp(density, 8);
        subLp.bottomMargin = dp(density, 12);
        panel.addView(sub, subLp);

        int qrSize = dp(density, 180);
        ImageView qrView = new ImageView(activity);
        qrView.setPadding(dp(density, 8), dp(density, 8), dp(density, 8), dp(density, 8));
        GradientDrawable qrBg = new GradientDrawable();
        qrBg.setColor(Color.WHITE);
        qrBg.setCornerRadius(12f * density);
        qrView.setBackground(qrBg);
        LinearLayout.LayoutParams qrLp = new LinearLayout.LayoutParams(qrSize, qrSize);
        qrLp.gravity = Gravity.CENTER_HORIZONTAL;
        qrLp.bottomMargin = dp(density, 10);
        panel.addView(qrView, qrLp);

        TextView secretView = new TextView(activity);
        secretView.setTextColor(0xFFFFD54F);
        secretView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 17f);
        secretView.setTypeface(UiFont.get(activity, R.string.font_medium));
        secretView.setGravity(Gravity.CENTER);
        secretView.setPadding(dp(density, 10), dp(density, 8), dp(density, 10), dp(density, 8));
        GradientDrawable secBg = new GradientDrawable();
        secBg.setColor(0x22FFFFFF);
        secBg.setCornerRadius(12f * density);
        secBg.setStroke(dp(density, 1), 0x44FFFFFF);
        secretView.setBackground(secBg);
        LinearLayout.LayoutParams secLp = new LinearLayout.LayoutParams(-1, -2);
        secLp.bottomMargin = dp(density, 14);
        panel.addView(secretView, secLp);

        Runnable refreshSecretUi = () -> {
            String sec = getOrCreateTotpSecret(activity);
            secretView.setText("密钥: " + Totp.formatSecret(sec));
            qrView.setImageBitmap(Totp.qrBitmap(Totp.otpAuthUri(sec), qrSize));
        };
        refreshSecretUi.run();

        final Dialog dialog = new Dialog(activity);
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE);
        dialog.setContentView(panel);
        dialog.setCanceledOnTouchOutside(true);

        LinearLayout actions = new LinearLayout(activity);
        actions.setOrientation(LinearLayout.HORIZONTAL);
        TextView verifyBtn = makeActionButton(activity, density, "验证并开启", () -> {
            dialog.dismiss();
            String secret = getOrCreateTotpSecret(activity);
            openPinEntryDialog(activity, "验证动态口令（前 4 位）", "输入手机上 6 位动态码的前 4 位以确认绑定", Totp.INPUT_DIGITS,
                    code -> Totp.verify(secret, code, System.currentTimeMillis()),
                    code -> {
                        setTotpEnabled(activity, true);
                        Toast.makeText(activity, "动态口令已开启", Toast.LENGTH_SHORT).show();
                    });
        });
        TextView rotateBtn = makeActionButton(activity, density, "换一个密钥", () -> {
            resetTotpSecret(activity);
            refreshSecretUi.run();
        });
        TextView cancelBtn = makeActionButton(activity, density, "取消", dialog::dismiss);
        LinearLayout.LayoutParams lp1 = new LinearLayout.LayoutParams(0, dp(density, 44), 1f);
        lp1.setMarginEnd(dp(density, 8));
        LinearLayout.LayoutParams lp2 = new LinearLayout.LayoutParams(0, dp(density, 44), 1f);
        lp2.setMarginEnd(dp(density, 8));
        actions.addView(verifyBtn, lp1);
        actions.addView(rotateBtn, lp2);
        actions.addView(cancelBtn, new LinearLayout.LayoutParams(0, dp(density, 44), 1f));
        panel.addView(actions);

        Window w = dialog.getWindow();
        if (w != null) {
            w.setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
            w.setLayout(dp(density, 520), ViewGroup.LayoutParams.WRAP_CONTENT);
            w.setDimAmount(0.65f);
        }
        dialog.show();
        verifyBtn.requestFocus();
    }

    static void showPinDialog(Activity activity, String titleText, String subText, Runnable onVerified) {
        if (isTotpEnabled(activity)) {
            String secret = getOrCreateTotpSecret(activity);
            openPinEntryDialog(activity, titleText, subText + "\n（动态口令模式：请输入手机动态码前 4 位）", Totp.INPUT_DIGITS,
                    code -> Totp.verify(secret, code, System.currentTimeMillis()),
                    code -> {
                        if (onVerified != null) onVerified.run();
                    });
            return;
        }
        String hint = isDefaultPin(activity) ? subText + "（初始密码: " + DEFAULT_PIN + "）" : subText;
        openPinEntryDialog(activity, titleText, hint, 4,
                code -> code.equals(getPin(activity)),
                code -> {
                    if (onVerified != null) onVerified.run();
                });
    }

    static void showChangePinDialog(Activity activity) {
        showPinDialog(activity, "修改家长密码", "请输入当前家长密码", () ->
                openPinEntryDialog(activity, "设置新家长密码", "请输入新的 4 位数字密码", 4, null, newPin -> {
                    setPin(activity, newPin);
                    Toast.makeText(activity, "家长密码已更新", Toast.LENGTH_SHORT).show();
                }));
    }

    private static void openPinEntryDialog(
            Activity activity, String titleText, String subText, int codeLength,
            Predicate<String> verifier, Consumer<String> onEntered) {
        if (activity == null || activity.isFinishing() || activity.isDestroyed()) return;
        float density = activity.getResources().getDisplayMetrics().density;

        LinearLayout panel = new LinearLayout(activity);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setBackgroundResource(R.drawable.glass_panel);
        panel.setPadding(dp(density, 24), dp(density, 22), dp(density, 24), dp(density, 20));

        TextView title = new TextView(activity);
        title.setText(titleText);
        title.setTextColor(Color.WHITE);
        title.setTextSize(TypedValue.COMPLEX_UNIT_SP, 21f);
        title.setTypeface(UiFont.get(activity, R.string.font_medium));
        panel.addView(title);

        TextView sub = new TextView(activity);
        sub.setText(subText);
        sub.setTextColor(0xD9FFFFFF);
        sub.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f);
        sub.setTypeface(UiFont.get(activity, R.string.font_body));
        LinearLayout.LayoutParams subLp = new LinearLayout.LayoutParams(-1, -2);
        subLp.topMargin = dp(density, 6);
        panel.addView(sub, subLp);

        TextView dots = new TextView(activity);
        dots.setTextColor(Color.WHITE);
        dots.setTextSize(TypedValue.COMPLEX_UNIT_SP, 26f);
        dots.setGravity(Gravity.CENTER);
        dots.setLetterSpacing(0.25f);
        LinearLayout.LayoutParams dotsLp = new LinearLayout.LayoutParams(-1, -2);
        dotsLp.topMargin = dp(density, 14);
        panel.addView(dots, dotsLp);

        String defaultTip = "方向键选择数字并按确定，或直接按数字键";
        TextView status = new TextView(activity);
        status.setText(defaultTip);
        status.setTextColor(0x99FFFFFF);
        status.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f);
        status.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams statusLp = new LinearLayout.LayoutParams(-1, -2);
        statusLp.topMargin = dp(density, 6);
        statusLp.bottomMargin = dp(density, 12);
        panel.addView(status, statusLp);

        final Dialog dialog = new Dialog(activity);
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE);
        dialog.setContentView(panel);
        dialog.setCanceledOnTouchOutside(true);

        final StringBuilder buf = new StringBuilder(codeLength);
        Runnable refreshDots = () -> {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < codeLength; i++) {
                if (i > 0) sb.append("  ");
                sb.append(i < buf.length() ? '\u25CF' : '\u25CB');
            }
            dots.setText(sb.toString());
        };
        refreshDots.run();

        Runnable submitIfReady = () -> {
            if (buf.length() < codeLength) return;
            String entered = buf.toString();
            if (verifier == null || verifier.test(entered)) {
                dialog.dismiss();
                onEntered.accept(entered);
            } else {
                buf.setLength(0);
                refreshDots.run();
                status.setText("密码错误，请重试");
                status.setTextColor(COLOR_RED);
            }
        };

        Consumer<Character> pushDigit = ch -> {
            if (buf.length() >= codeLength) return;
            status.setText(defaultTip);
            status.setTextColor(0x99FFFFFF);
            buf.append(ch);
            refreshDots.run();
            submitIfReady.run();
        };

        Runnable popDigit = () -> {
            if (buf.length() > 0) {
                buf.deleteCharAt(buf.length() - 1);
                refreshDots.run();
            }
        };

        TextView[][] buttons = new TextView[KEYPAD_ROWS.length][];
        int[][] ids = new int[KEYPAD_ROWS.length][];
        for (int r = 0; r < KEYPAD_ROWS.length; r++) {
            buttons[r] = new TextView[KEYPAD_ROWS[r].length];
            ids[r] = new int[KEYPAD_ROWS[r].length];
            for (int c = 0; c < KEYPAD_ROWS[r].length; c++) {
                ids[r][c] = View.generateViewId();
            }
        }

        for (int r = 0; r < KEYPAD_ROWS.length; r++) {
            LinearLayout row = new LinearLayout(activity);
            row.setOrientation(LinearLayout.HORIZONTAL);
            row.setGravity(Gravity.CENTER);
            LinearLayout.LayoutParams rowLp = new LinearLayout.LayoutParams(-1, -2);
            if (r > 0) rowLp.topMargin = dp(density, 8);
            for (int c = 0; c < KEYPAD_ROWS[r].length; c++) {
                String label = KEYPAD_ROWS[r][c];
                TextView btn = new TextView(activity);
                btn.setId(ids[r][c]);
                btn.setText(label);
                btn.setGravity(Gravity.CENTER);
                btn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 18f);
                btn.setTypeface(UiFont.get(activity, R.string.font_medium));
                btn.setFocusable(true);
                btn.setFocusableInTouchMode(true);
                btn.setClickable(true);
                styleKeyButton(btn, density, false);
                btn.setOnFocusChangeListener((v, focused) -> {
                    styleKeyButton(btn, density, focused);
                    btn.setScaleX(focused ? 1.08f : 1f);
                    btn.setScaleY(focused ? 1.08f : 1f);
                });
                btn.setOnClickListener(v -> {
                    if ("\u232B".equals(label)) popDigit.run();
                    else pushDigit.accept(label.charAt(0));
                });

                btn.setNextFocusUpId(r == 0 ? ids[r][c] : ids[0][Math.min(c, KEYPAD_ROWS[0].length - 1)]);
                btn.setNextFocusDownId(r == KEYPAD_ROWS.length - 1 ? ids[r][c] : ids[1][c]);
                btn.setNextFocusLeftId(c == 0 ? ids[r][c] : ids[r][c - 1]);
                btn.setNextFocusRightId(c == KEYPAD_ROWS[r].length - 1 ? ids[r][c] : ids[r][c + 1]);

                LinearLayout.LayoutParams bLp = new LinearLayout.LayoutParams(dp(density, 48), dp(density, 44));
                bLp.setMargins(dp(density, 4), dp(density, 2), dp(density, 4), dp(density, 2));
                row.addView(btn, bLp);
                buttons[r][c] = btn;
            }
            panel.addView(row, rowLp);
        }

        dialog.setOnKeyListener((d, keyCode, event) -> {
            if (event.getAction() != KeyEvent.ACTION_DOWN || event.getRepeatCount() != 0) return false;
            int digit = keyDigit(keyCode);
            if (digit >= 0) {
                pushDigit.accept((char) ('0' + digit));
                return true;
            }
            if (keyCode == KeyEvent.KEYCODE_DEL) {
                popDigit.run();
                return true;
            }
            return false;
        });

        Window w = dialog.getWindow();
        if (w != null) {
            w.setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
            w.setLayout(dp(density, 420), ViewGroup.LayoutParams.WRAP_CONTENT);
            w.setDimAmount(0.65f);
        }
        dialog.show();
        buttons[0][0].requestFocus();
    }

    private static int keyDigit(int keyCode) {
        if (keyCode >= KeyEvent.KEYCODE_0 && keyCode <= KeyEvent.KEYCODE_9) {
            return keyCode - KeyEvent.KEYCODE_0;
        }
        if (keyCode >= KeyEvent.KEYCODE_NUMPAD_0 && keyCode <= KeyEvent.KEYCODE_NUMPAD_9) {
            return keyCode - KeyEvent.KEYCODE_NUMPAD_0;
        }
        return -1;
    }

    private static void styleKeyButton(TextView btn, float density, boolean focused) {
        GradientDrawable bg = new GradientDrawable();
        bg.setCornerRadius(12f * density);
        if (focused) {
            bg.setColor(Color.WHITE);
            btn.setTextColor(0xFF14161C);
        } else {
            bg.setColor(0x22FFFFFF);
            bg.setStroke(dp(density, 1), 0x33FFFFFF);
            btn.setTextColor(Color.WHITE);
        }
        btn.setBackground(bg);
    }

    private static void startTicker(Context appCtx, String pkg, String displayLabel, int limitSec, long limitMs) {
        Runnable task = new Runnable() {
            @Override
            public void run() {
                if (!pkg.equals(activePkg)) return;
                long remainingMs = limitMs - getUsedMs(appCtx, pkg);
                if (remainingMs <= 0L) {
                    forceExit(appCtx, pkg, displayLabel);
                    return;
                }
                int remainingSec = (int) Math.ceil(remainingMs / 1000.0);
                int finalWindowSec = limitSec <= 30 ? 10 : 15;
                if (remainingSec <= finalWindowSec) {
                    int border = remainingSec <= 5 ? COLOR_RED : COLOR_AMBER;
                    showOverlay(appCtx,
                            "\u23F3 " + displayLabel + " 即将暂停并返回桌面：剩余 " + remainingSec + " 秒",
                            border, 0L);
                } else if (limitSec > 60 && remainingSec >= 55 && remainingSec <= 60) {
                    showOverlay(appCtx,
                            "\u23F3 " + displayLabel + " 今日剩余使用时间还有 1 分钟",
                            COLOR_AMBER, 0L);
                } else if (!bannerIsNotice) {
                    hideOverlay(appCtx);
                }
                long delay = Math.min(TICK_MS, Math.max(100L, remainingMs));
                HANDLER.postDelayed(this, delay);
            }
        };
        tickRunnable = task;
        HANDLER.postDelayed(task, Math.min(TICK_MS, Math.max(100L, limitMs - getUsedMs(appCtx, pkg))));
    }

    private static void forceExit(Context appCtx, String pkg, String displayLabel) {
        stopTicker();
        flush(appCtx);
        if (GoUnlockActivity.isActive) {
            hideOverlay(appCtx);
            return;
        }
        String msg = "\u26D4 " + displayLabel + " 今日使用时间已到，已暂停并切到后台";
        if (!showOverlay(appCtx, msg, COLOR_RED, 3500L)) {
            Toast.makeText(appCtx, msg, Toast.LENGTH_LONG).show();
        }

        if (HomeKeyService.running != null) {
            HomeKeyService.running.performGlobalAction(AccessibilityService.GLOBAL_ACTION_HOME);
        }
        Intent home = new Intent(appCtx, MainActivity.class)
                .setAction(Intent.ACTION_MAIN)
                .addCategory(Intent.CATEGORY_HOME)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK
                        | Intent.FLAG_ACTIVITY_CLEAR_TOP
                        | Intent.FLAG_ACTIVITY_SINGLE_TOP)
                .putExtra(EXTRA_EXPIRED_LABEL, displayLabel);
        try {
            appCtx.startActivity(home);
        } catch (RuntimeException ignored) {
        }
    }

    private static boolean showOverlay(Context appCtx, String text, int borderColor, long autoHideMs) {
        if (!Settings.canDrawOverlays(appCtx)) {
            if (autoHideMs == 0L) Toast.makeText(appCtx, text, Toast.LENGTH_SHORT).show();
            return false;
        }
        WindowManager wm = appCtx.getSystemService(WindowManager.class);
        if (wm == null) return false;
        if (hideOverlayRunnable != null) {
            HANDLER.removeCallbacks(hideOverlayRunnable);
            hideOverlayRunnable = null;
        }
        bannerIsNotice = autoHideMs > 0L;
        float density = appCtx.getResources().getDisplayMetrics().density;
        if (overlayView == null) {
            TextView tv = new TextView(appCtx);
            tv.setTextColor(Color.WHITE);
            tv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 17f);
            tv.setTypeface(UiFont.get(appCtx, R.string.font_medium));
            tv.setPadding(dp(density, 20), dp(density, 12), dp(density, 20), dp(density, 12));
            tv.setMaxWidth(dp(density, 520));
            tv.setElevation(dp(density, 8));
            tv.setBackground(makeBannerBackground(density, borderColor));
            tv.setText(text);
            WindowManager.LayoutParams lp = new WindowManager.LayoutParams(
                    WindowManager.LayoutParams.WRAP_CONTENT,
                    WindowManager.LayoutParams.WRAP_CONTENT,
                    WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                            | WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
                            | WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE
                            | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                    PixelFormat.TRANSLUCENT);
            lp.gravity = Gravity.TOP | Gravity.END;
            lp.x = dp(density, 28);
            lp.y = dp(density, 28);
            try {
                wm.addView(tv, lp);
                overlayView = tv;
                overlayBorderColor = borderColor;
            } catch (RuntimeException ignored) {
                return false;
            }
        } else {
            overlayView.setText(text);
            if (overlayBorderColor != borderColor) {
                overlayView.setBackground(makeBannerBackground(density, borderColor));
                overlayBorderColor = borderColor;
            }
        }
        if (autoHideMs > 0L) {
            hideOverlayRunnable = () -> hideOverlay(appCtx);
            HANDLER.postDelayed(hideOverlayRunnable, autoHideMs);
        }
        return true;
    }

    private static void hideOverlay(Context appCtx) {
        if (hideOverlayRunnable != null) {
            HANDLER.removeCallbacks(hideOverlayRunnable);
            hideOverlayRunnable = null;
        }
        bannerIsNotice = false;
        TextView view = overlayView;
        overlayView = null;
        if (view == null) return;
        WindowManager wm = appCtx.getSystemService(WindowManager.class);
        if (wm != null) {
            try {
                wm.removeViewImmediate(view);
            } catch (RuntimeException ignored) {
            }
        }
    }

    private static GradientDrawable makeBannerBackground(float density, int borderColor) {
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(0xFF16181F);
        bg.setCornerRadius(16f * density);
        bg.setStroke(dp(density, 2), borderColor);
        return bg;
    }

    private static int dp(float density, int value) {
        return Math.max(1, Math.round(value * density));
    }

    private static void flush(Context ctx) {
        if (activePkg == null) return;
        String pkg = activePkg;
        long start = activeStartElapsed;
        activePkg = null;
        activeStartElapsed = 0L;
        if (start <= 0L) return;
        SharedPreferences sp = prefs(ctx);
        ensureToday(sp);
        long elapsed = Math.max(0L, SystemClock.elapsedRealtime() - start);
        long prev = Math.max(0L, sp.getLong(PREFIX_USED + pkg, 0L));
        sp.edit().putLong(PREFIX_USED + pkg, prev + elapsed).apply();
    }

    private static void stopTicker() {
        if (tickRunnable != null) {
            HANDLER.removeCallbacks(tickRunnable);
            tickRunnable = null;
        }
    }

    private static void ensureToday(SharedPreferences sp) {
        long today = LocalDate.now().toEpochDay();
        if (sp.getLong(KEY_DAY, Long.MIN_VALUE) == today) return;
        SharedPreferences.Editor ed = sp.edit();
        Map<String, ?> all = sp.getAll();
        for (String key : all.keySet()) {
            if (key.startsWith(PREFIX_USED) || key.startsWith(PREFIX_BONUS_SEC)) ed.remove(key);
        }
        ed.putLong(KEY_DAY, today).apply();
        if (activePkg != null) activeStartElapsed = SystemClock.elapsedRealtime();
    }

    private static SharedPreferences prefs(Context ctx) {
        return ctx.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }
}
