package com.kai.jobsprint;

import android.app.Activity;
import android.webkit.JavascriptInterface;

final class AndroidRemoteSettingsBridge {
    private final Activity activity;
    private final RemoteWebViewController remoteWebViewController;

    AndroidRemoteSettingsBridge(Activity activity, RemoteWebViewController remoteWebViewController) {
        this.activity = activity;
        this.remoteWebViewController = remoteWebViewController;
    }

    @JavascriptInterface
    public String getRemoteUrl() {
        return remoteWebViewController.getConfiguredRemoteUrl();
    }

    @JavascriptInterface
    public boolean setRemoteUrl(String url) {
        return remoteWebViewController.saveRemoteUrl(url);
    }

    @JavascriptInterface
    public void reloadRemote() {
        activity.runOnUiThread(() -> remoteWebViewController.loadRemoteOrFallback("远端服务地址不可用"));
    }

    @JavascriptInterface
    public void loadFallback() {
        activity.runOnUiThread(() -> remoteWebViewController.loadFallback("用户切换到离线模式"));
    }
}
