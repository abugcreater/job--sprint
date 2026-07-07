package com.kai.jobsprint;

import android.app.Activity;
import android.webkit.WebSettings;
import android.webkit.WebView;

final class AndroidWebViewInitializer {
    private final Activity activity;
    private final WebView webView;
    private final RemoteWebViewController remoteWebViewController;
    private final AuthCredentialStore credentialStore;
    private final AndroidBasicAuthController basicAuthController;
    private final int audioPermissionRequest;

    AndroidWebViewInitializer(
        Activity activity,
        WebView webView,
        RemoteWebViewController remoteWebViewController,
        AuthCredentialStore credentialStore,
        AndroidBasicAuthController basicAuthController,
        int audioPermissionRequest
    ) {
        this.activity = activity;
        this.webView = webView;
        this.remoteWebViewController = remoteWebViewController;
        this.credentialStore = credentialStore;
        this.basicAuthController = basicAuthController;
        this.audioPermissionRequest = audioPermissionRequest;
    }

    AndroidActivityLifecycleController initialize() {
        configureSettings();

        AndroidSpeechBridge speechBridge = new AndroidSpeechBridge(activity, webView, audioPermissionRequest);
        AndroidRecorderBridge recorderBridge = new AndroidRecorderBridge(
            activity,
            webView,
            remoteWebViewController,
            audioPermissionRequest
        );
        webView.addJavascriptInterface(speechBridge, "AndroidSpeech");
        webView.addJavascriptInterface(recorderBridge, "AndroidRecorder");
        webView.addJavascriptInterface(
            new AndroidRemoteSettingsBridge(activity, remoteWebViewController),
            "AndroidRemoteSettings"
        );
        webView.addJavascriptInterface(
            new AndroidAuthSettingsBridge(activity, credentialStore),
            "AndroidAuthSettings"
        );
        webView.addJavascriptInterface(
            new AndroidSessionCookieBridge(activity, remoteWebViewController),
            "AndroidSessionCookies"
        );

        webView.setWebChromeClient(new AndroidWebChromePermissionController(activity, audioPermissionRequest));
        webView.setWebViewClient(new AndroidRemoteWebViewClient(basicAuthController, remoteWebViewController));

        return new AndroidActivityLifecycleController(
            webView,
            speechBridge,
            recorderBridge,
            audioPermissionRequest
        );
    }

    private void configureSettings() {
        WebView.setWebContentsDebuggingEnabled(true);
        WebSettings settings = webView.getSettings();
        settings.setUserAgentString("JobSprintAndroidWebView/1.0");
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        remoteWebViewController.configureRemoteWebSettings();
    }
}
