package com.kai.jobsprint;

import android.app.Activity;
import android.webkit.WebView;

final class AndroidAppStartupController {
    private final Activity activity;
    private final int audioPermissionRequest;
    private final boolean loadRemoteByDefault;

    AndroidAppStartupController(Activity activity, int audioPermissionRequest, boolean loadRemoteByDefault) {
        this.activity = activity;
        this.audioPermissionRequest = audioPermissionRequest;
        this.loadRemoteByDefault = loadRemoteByDefault;
    }

    AndroidActivityLifecycleController start() {
        AuthCredentialStore credentialStore = new AuthCredentialStore(activity);
        AndroidWindowLayoutController windowLayoutController = new AndroidWindowLayoutController(activity);
        windowLayoutController.configureWindowChrome();
        WebView webView = windowLayoutController.createWebView();
        windowLayoutController.attachContentView(webView);

        RemoteWebViewController remoteWebViewController = new RemoteWebViewController(
            activity,
            webView,
            credentialStore,
            activity.getString(R.string.remote_schedule_url)
        );
        AndroidBasicAuthController basicAuthController = new AndroidBasicAuthController(
            activity,
            credentialStore,
            remoteWebViewController
        );
        AndroidActivityLifecycleController lifecycleController = new AndroidWebViewInitializer(
            activity,
            webView,
            remoteWebViewController,
            credentialStore,
            basicAuthController,
            audioPermissionRequest
        ).initialize();

        if (loadRemoteByDefault) {
            remoteWebViewController.loadRemoteOrFallback("未配置可用远端服务地址");
        } else {
            remoteWebViewController.loadLocalReactOrFallback();
        }
        return lifecycleController;
    }
}
