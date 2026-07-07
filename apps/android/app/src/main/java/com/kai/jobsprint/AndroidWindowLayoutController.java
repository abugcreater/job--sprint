package com.kai.jobsprint;

import android.app.Activity;
import android.graphics.Color;
import android.graphics.Insets;
import android.os.Build;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.webkit.WebView;
import android.widget.FrameLayout;

final class AndroidWindowLayoutController {
    private final Activity activity;

    AndroidWindowLayoutController(Activity activity) {
        this.activity = activity;
    }

    void configureWindowChrome() {
        activity.getWindow().setStatusBarColor(Color.rgb(17, 26, 32));
        activity.getWindow().setNavigationBarColor(Color.WHITE);
        configureSystemBars();
    }

    WebView createWebView() {
        WebView webView = new WebView(activity);
        webView.setBackgroundColor(Color.rgb(243, 246, 247));
        return webView;
    }

    void attachContentView(WebView webView) {
        FrameLayout root = new FrameLayout(activity);
        root.setBackgroundColor(Color.rgb(243, 246, 247));
        root.setPadding(0, statusBarHeight(), 0, 0);
        root.addView(webView, new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ));
        applySystemBarInsets(root);
        activity.setContentView(root);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT_WATCH) {
            root.requestApplyInsets();
        }
    }

    private void configureSystemBars() {
        int flags = 0;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        }
        activity.getWindow().getDecorView().setSystemUiVisibility(flags);
    }

    private void applySystemBarInsets(View root) {
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            int topInset;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                Insets systemBars = insets.getInsets(WindowInsets.Type.systemBars());
                topInset = systemBars.top;
            } else {
                topInset = insets.getSystemWindowInsetTop();
            }
            view.setPadding(0, Math.max(topInset, statusBarHeight()), 0, 0);
            return insets;
        });
    }

    private int statusBarHeight() {
        int resourceId = activity.getResources().getIdentifier("status_bar_height", "dimen", "android");
        if (resourceId > 0) {
            return activity.getResources().getDimensionPixelSize(resourceId);
        }
        return Math.round(24 * activity.getResources().getDisplayMetrics().density);
    }
}
