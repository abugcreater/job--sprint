package com.kai.jobsprint;

import android.app.Activity;
import android.webkit.WebView;

final class AndroidBackNavigationController {
    private static final String REQUEST_WEB_BACK_SCRIPT = "(function(){try{var event=new Event('jobsprint:android-back-pressed',{cancelable:true});return String(!window.dispatchEvent(event));}catch(error){return 'false';}})()";

    private final Activity activity;
    private final WebView webView;

    AndroidBackNavigationController(Activity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
    }

    boolean requestSystemBack() {
        if (webView == null) {
            return false;
        }
        webView.evaluateJavascript(REQUEST_WEB_BACK_SCRIPT, result -> {
            if ("\"true\"".equals(result)) {
                return;
            }
            completeBackNavigation();
        });
        return true;
    }

    void completeBackNavigation() {
        activity.runOnUiThread(() -> {
            if (webView != null && webView.canGoBack()) {
                webView.goBack();
                return;
            }
            activity.finish();
        });
    }

    void destroy() {
        if (webView != null) {
            webView.destroy();
        }
    }
}
