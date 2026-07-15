package com.kai.jobsprint;

import android.app.Activity;
import android.graphics.Color;
import android.os.Build;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;
import android.widget.FrameLayout;

final class AndroidWindowLayoutController {
    private final Activity activity;

    AndroidWindowLayoutController(Activity activity) {
        this.activity = activity;
    }

    void configureWindowChrome() {
        activity.getWindow().setStatusBarColor(Color.rgb(23, 33, 31));
        activity.getWindow().setNavigationBarColor(Color.WHITE);
        configureSystemBars();
    }

    WebView createWebView() {
        WebView webView = new WebView(activity);
        webView.setBackgroundColor(Color.rgb(242, 244, 241));
        return webView;
    }

    void attachContentView(WebView webView) {
        FrameLayout root = new FrameLayout(activity);
        root.setBackgroundColor(Color.rgb(242, 244, 241));
        root.addView(webView, new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ));
        activity.setContentView(root);
    }

    private void configureSystemBars() {
        int flags = 0;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        }
        activity.getWindow().getDecorView().setSystemUiVisibility(flags);
    }
}
