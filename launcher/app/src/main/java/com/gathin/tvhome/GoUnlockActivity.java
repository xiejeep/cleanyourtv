package com.gathin.tvhome;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONArray;

import java.io.IOException;
import java.io.InputStream;
import java.util.Collections;
import java.util.Locale;

/**
 * Full-screen WebView host for the LAN/server-deployed Go puzzle game used to
 * earn +30 minutes of screen time when a previously unrewarded level is passed.
 */
public final class GoUnlockActivity extends Activity {

    static final String EXTRA_PKG = "com.gathin.tvhome.extra.GO_UNLOCK_PKG";
    static final String EXTRA_LABEL = "com.gathin.tvhome.extra.GO_UNLOCK_LABEL";
    static volatile boolean isActive;
    private static final String LOCAL_HOST = "go-local.tvhome";
    private static final String LOCAL_BASE_URL = "https://" + LOCAL_HOST + "/index.html";

    private final Handler handler = new Handler(Looper.getMainLooper());
    private WebView webView;
    private LinearLayout errorPanel;
    private TextView errorDetail;
    private TextView retryBtn;
    private String targetPkg;
    private String targetLabel;
    private String activeUrl;
    private boolean rewardHandled;

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        targetPkg = getIntent().getStringExtra(EXTRA_PKG);
        targetLabel = getIntent().getStringExtra(EXTRA_LABEL);
        if (targetLabel == null || targetLabel.isEmpty()) {
            targetLabel = targetPkg == null ? "" : targetPkg;
        }

        float density = getResources().getDisplayMetrics().density;
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(0xFF10131A);

        webView = new WebView(this);
        webView.setBackgroundColor(0xFF10131A);
        webView.setFocusable(true);
        webView.setFocusableInTouchMode(true);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        webView.addJavascriptInterface(new TvUnlockBridge(), "TvUnlockBridge");
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request == null ? null : request.getUrl();
                if (uri != null && LOCAL_HOST.equals(uri.getHost())) {
                    return serveBundledAsset(uri.getPath());
                }
                return super.shouldInterceptRequest(view, request);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                if (errorPanel.getVisibility() != View.VISIBLE) {
                    webView.requestFocus();
                }
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request != null && request.isForMainFrame()) {
                    String desc = error != null && error.getDescription() != null
                            ? error.getDescription().toString()
                            : "连接失败";
                    showError("无法连接到围棋服务器：\n" + activeUrl + "\n（" + desc + "）");
                }
            }
        });
        root.addView(webView, new FrameLayout.LayoutParams(-1, -1));

        errorPanel = buildErrorPanel(density);
        errorPanel.setVisibility(View.GONE);
        root.addView(errorPanel, new FrameLayout.LayoutParams(
                dp(density, 520), -2, Gravity.CENTER));

        setContentView(root);
        ScreenTime.onHomeResumed(this);
        loadGame();
    }

    @Override
    protected void onResume() {
        super.onResume();
        isActive = true;
        ScreenTime.onHomeResumed(this);
    }

    @Override
    protected void onPause() {
        isActive = false;
        super.onPause();
    }

    private void loadGame() {
        errorPanel.setVisibility(View.GONE);
        webView.setVisibility(View.VISIBLE);
        String baseUrl = ScreenTime.getGoGameUrl(this);
        if (ScreenTime.LOCAL_GO_GAME_URL.equalsIgnoreCase(baseUrl)) {
            baseUrl = LOCAL_BASE_URL;
        }
        activeUrl = Uri.parse(baseUrl).buildUpon()
                .appendQueryParameter("mode", "tv_unlock")
                .appendQueryParameter("bonusMin", String.valueOf(ScreenTime.getGoBonusMinutes(this)))
                .appendQueryParameter("t", String.valueOf(System.currentTimeMillis()))
                .build()
                .toString();
        webView.loadUrl(activeUrl);
        webView.requestFocus();
    }

    private WebResourceResponse serveBundledAsset(String rawPath) {
        String path = rawPath == null || rawPath.isEmpty() || "/".equals(rawPath)
                ? "index.html"
                : (rawPath.startsWith("/") ? rawPath.substring(1) : rawPath);
        if (path.contains("..")) return null;
        try {
            InputStream stream = getAssets().open("go_game/" + path);
            return new WebResourceResponse(
                    mimeTypeFor(path),
                    "UTF-8",
                    200,
                    "OK",
                    Collections.singletonMap("Access-Control-Allow-Origin", "*"),
                    stream);
        } catch (IOException e) {
            return null;
        }
    }

    private static String mimeTypeFor(String path) {
        String lower = path.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".html")) return "text/html";
        if (lower.endsWith(".js") || lower.endsWith(".mjs")) return "application/javascript";
        if (lower.endsWith(".css")) return "text/css";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".json")) return "application/json";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        return "application/octet-stream";
    }

    private void showError(String message) {
        webView.setVisibility(View.GONE);
        errorDetail.setText(message);
        errorPanel.setVisibility(View.VISIBLE);
        retryBtn.requestFocus();
    }

    private LinearLayout buildErrorPanel(float density) {
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setBackgroundResource(R.drawable.glass_panel);
        panel.setPadding(dp(density, 28), dp(density, 24), dp(density, 28), dp(density, 24));

        TextView title = new TextView(this);
        title.setText("围棋闯关页面加载失败");
        title.setTextColor(Color.WHITE);
        title.setTextSize(TypedValue.COMPLEX_UNIT_SP, 20f);
        title.setTypeface(UiFont.get(this, R.string.font_medium));
        panel.addView(title);

        errorDetail = new TextView(this);
        errorDetail.setTextColor(0xD9FFFFFF);
        errorDetail.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f);
        errorDetail.setTypeface(UiFont.get(this, R.string.font_body));
        LinearLayout.LayoutParams detLp = new LinearLayout.LayoutParams(-1, -2);
        detLp.topMargin = dp(density, 10);
        detLp.bottomMargin = dp(density, 18);
        panel.addView(errorDetail, detLp);

        LinearLayout actions = new LinearLayout(this);
        actions.setOrientation(LinearLayout.HORIZONTAL);
        retryBtn = makeButton(density, "重试", v -> loadGame());
        TextView backBtn = makeButton(density, "返回", v -> finish());
        LinearLayout.LayoutParams btnLp = new LinearLayout.LayoutParams(0, dp(density, 44), 1f);
        btnLp.setMarginEnd(dp(density, 10));
        actions.addView(retryBtn, btnLp);
        actions.addView(backBtn, new LinearLayout.LayoutParams(0, dp(density, 44), 1f));
        panel.addView(actions);
        return panel;
    }

    private TextView makeButton(float density, String text, View.OnClickListener onClick) {
        TextView btn = new TextView(this);
        btn.setText(text);
        btn.setGravity(Gravity.CENTER);
        btn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f);
        btn.setTypeface(UiFont.get(this, R.string.font_medium));
        btn.setFocusable(true);
        btn.setFocusableInTouchMode(true);
        btn.setClickable(true);
        styleButton(btn, density, false);
        btn.setOnFocusChangeListener((v, focused) -> styleButton(btn, density, focused));
        btn.setOnClickListener(onClick);
        return btn;
    }

    private static void styleButton(TextView btn, float density, boolean focused) {
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

    private void relaunchTargetAndFinish() {
        if (isFinishing() || isDestroyed()) return;
        if (targetPkg != null && !targetPkg.isEmpty()) {
            Intent launch = getPackageManager().getLeanbackLaunchIntentForPackage(targetPkg);
            if (launch == null) launch = getPackageManager().getLaunchIntentForPackage(targetPkg);
            if (launch != null && ScreenTime.tryLaunch(this, targetPkg, targetLabel)) {
                try {
                    startActivity(launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
                } catch (ActivityNotFoundException | SecurityException ignored) {
                }
            }
        }
        finish();
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        if (event.getKeyCode() == KeyEvent.KEYCODE_BACK) {
            if (event.getAction() == KeyEvent.ACTION_DOWN && event.getRepeatCount() == 0) {
                finish();
            }
            return true;
        }
        return super.dispatchKeyEvent(event);
    }

    @Override
    protected void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    private static int dp(float density, int value) {
        return Math.max(1, Math.round(value * density));
    }

    private final class TvUnlockBridge {
        @JavascriptInterface
        public int getBonusMinutes() {
            return ScreenTime.getGoBonusMinutes(GoUnlockActivity.this);
        }

        @JavascriptInterface
        public String getRewardedLevelIds() {
            return new JSONArray(ScreenTime.getRewardedLevels(GoUnlockActivity.this)).toString();
        }

        @JavascriptInterface
        public void onLevelPassed(String levelId) {
            handler.post(() -> {
                if (rewardHandled || isFinishing() || isDestroyed()) return;
                boolean granted = ScreenTime.grantGoLevelBonus(GoUnlockActivity.this, targetPkg, levelId);
                if (granted) {
                    rewardHandled = true;
                    int bonusMin = ScreenTime.getGoBonusMinutes(GoUnlockActivity.this);
                    Toast.makeText(GoUnlockActivity.this,
                            "闯关成功！已为「" + targetLabel + "」延长 " + bonusMin + " 分钟",
                            Toast.LENGTH_LONG).show();
                    handler.postDelayed(GoUnlockActivity.this::relaunchTargetAndFinish, 1200L);
                } else {
                    Toast.makeText(GoUnlockActivity.this,
                            "该关卡已领取过奖励，请挑战未通关关卡",
                            Toast.LENGTH_SHORT).show();
                }
            });
        }

        @JavascriptInterface
        public void close() {
            handler.post(GoUnlockActivity.this::finish);
        }
    }
}
