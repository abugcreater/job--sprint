package com.kai.jobsprint;

import android.app.Activity;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;

import java.io.IOException;
import java.io.InputStream;

final class RemoteWebViewController {
    private static final String LOCAL_REACT_ASSET_PATH = "react/index.html";
    private static final String LOCAL_REACT_URL = "file:///android_asset/" + LOCAL_REACT_ASSET_PATH;
    private static final String LOCAL_FALLBACK_URL = "file:///android_asset/web/schedule.html";

    private final Activity activity;
    private final WebView webView;
    private final AuthCredentialStore credentialStore;
    private final String defaultRemoteUrl;

    private boolean fallbackLoaded = false;
    private boolean legacyFallbackLoaded = false;
    private volatile String lastLoadedUrl = "";

    RemoteWebViewController(
        Activity activity,
        WebView webView,
        AuthCredentialStore credentialStore,
        String defaultRemoteUrl
    ) {
        this.activity = activity;
        this.webView = webView;
        this.credentialStore = credentialStore;
        this.defaultRemoteUrl = defaultRemoteUrl;
    }

    void loadRemoteOrFallback(String fallbackReason) {
        String remoteUrl = getConfiguredRemoteUrl();
        if (RemoteUrlPolicy.isUsableRemoteUrl(remoteUrl)) {
            fallbackLoaded = false;
            legacyFallbackLoaded = false;
            configureRemoteWebSettings();
            lastLoadedUrl = remoteUrl;
            webView.loadUrl(remoteUrl);
            return;
        }
        loadFallback(fallbackReason);
    }

    String getConfiguredRemoteUrl() {
        String saved = credentialStore.remoteUrl();
        if (saved != null && !saved.trim().isEmpty()) {
            return RemoteUrlPolicy.normalizeRemoteUrl(saved);
        }
        return RemoteUrlPolicy.normalizeRemoteUrl(defaultRemoteUrl);
    }

    boolean saveRemoteUrl(String url) {
        String normalized = RemoteUrlPolicy.normalizeRemoteUrl(url);
        if (!RemoteUrlPolicy.isUsableRemoteUrl(normalized)) {
            return false;
        }
        credentialStore.saveRemoteUrl(normalized);
        return true;
    }

    boolean loadLoginOrFallback() {
        String loginUrl = RemoteUrlPolicy.loginUrlFor(getConfiguredRemoteUrl());
        if (loginUrl.isEmpty()) {
            loadFallback("远端登录地址不可用");
            return false;
        }
        fallbackLoaded = false;
        legacyFallbackLoaded = false;
        configureRemoteWebSettings();
        lastLoadedUrl = loginUrl;
        webView.loadUrl(loginUrl);
        return true;
    }

    void loadLocalReactOrFallback() {
        if (!loadLocalReact(false)) {
            loadLegacyFallback("React build 缺失");
        }
    }

    void loadFallback(String reason) {
        if (fallbackLoaded) {
            return;
        }
        if (!loadLocalReact(true)) {
            loadLegacyFallback(reason + "，React build 缺失");
        }
    }

    private boolean loadLocalReact(boolean asFallback) {
        if (!assetExists(LOCAL_REACT_ASSET_PATH)) {
            return false;
        }
        fallbackLoaded = asFallback;
        legacyFallbackLoaded = false;
        configureLocalFallbackWebSettings();
        lastLoadedUrl = LOCAL_REACT_URL;
        webView.loadUrl(LOCAL_REACT_URL);
        return true;
    }

    private void loadLegacyFallback(String reason) {
        if (legacyFallbackLoaded) {
            return;
        }
        fallbackLoaded = true;
        legacyFallbackLoaded = true;
        configureLocalFallbackWebSettings();
        Toast.makeText(activity, reason + "，已切换到旧版离线页面", Toast.LENGTH_LONG).show();
        lastLoadedUrl = LOCAL_FALLBACK_URL;
        webView.loadUrl(LOCAL_FALLBACK_URL);
    }

    boolean isFallbackLoaded() {
        return fallbackLoaded;
    }

    String lastLoadedUrl() {
        return lastLoadedUrl;
    }

    void setLastLoadedUrl(String url) {
        lastLoadedUrl = url == null ? "" : url;
    }

    void configureRemoteWebSettings() {
        WebSettings settings = webView.getSettings();
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
    }

    void configureLocalFallbackWebSettings() {
        WebSettings settings = webView.getSettings();
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
    }

    private boolean assetExists(String assetPath) {
        try (InputStream ignored = activity.getAssets().open(assetPath)) {
            return true;
        } catch (IOException error) {
            return false;
        }
    }
}
