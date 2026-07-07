package com.kai.jobsprint;

import android.app.Activity;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

final class AndroidSessionCookieBridge {
    private static final String SESSION_COOKIE = "job_sprint_session";

    private final Activity activity;
    private final RemoteWebViewController remoteWebViewController;

    AndroidSessionCookieBridge(Activity activity, RemoteWebViewController remoteWebViewController) {
        this.activity = activity;
        this.remoteWebViewController = remoteWebViewController;
    }

    @JavascriptInterface
    public boolean hasSessionCookie() {
        String remoteUrl = remoteWebViewController.getConfiguredRemoteUrl();
        if (!RemoteUrlPolicy.isUsableRemoteUrl(remoteUrl)) {
            return false;
        }
        String cookieHeader = CookieManager.getInstance().getCookie(remoteUrl);
        return cookieHeader != null && cookieHeader.contains(SESSION_COOKIE + "=");
    }

    @JavascriptInterface
    public void clearSessionCookie() {
        activity.runOnUiThread(() -> {
            String remoteUrl = remoteWebViewController.getConfiguredRemoteUrl();
            if (!RemoteUrlPolicy.isUsableRemoteUrl(remoteUrl)) {
                Toast.makeText(activity, "远端 URL 不可用，未清除 session cookie", Toast.LENGTH_SHORT).show();
                return;
            }
            clearSessionCookieFor(remoteUrl);
            Toast.makeText(activity, "已清除本机 session cookie", Toast.LENGTH_SHORT).show();
        });
    }

    @JavascriptInterface
    public void clearSessionAndOpenLogin() {
        activity.runOnUiThread(() -> {
            String remoteUrl = remoteWebViewController.getConfiguredRemoteUrl();
            if (!RemoteUrlPolicy.isUsableRemoteUrl(remoteUrl)) {
                Toast.makeText(activity, "远端 URL 不可用，无法打开登录页", Toast.LENGTH_SHORT).show();
                return;
            }
            clearSessionCookieFor(remoteUrl);
            if (remoteWebViewController.loadLoginOrFallback()) {
                Toast.makeText(activity, "已清除 session cookie，正在打开登录页", Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void clearSessionCookieFor(String remoteUrl) {
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setCookie(remoteUrl, SESSION_COOKIE + "=; Path=/; Max-Age=0");
        cookieManager.setCookie(remoteUrl, SESSION_COOKIE + "=; Path=/job-sprint; Max-Age=0");
        cookieManager.flush();
    }
}
