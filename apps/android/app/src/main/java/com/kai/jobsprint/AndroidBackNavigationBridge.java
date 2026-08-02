package com.kai.jobsprint;

import android.webkit.JavascriptInterface;

final class AndroidBackNavigationBridge {
    private final AndroidBackNavigationController backNavigationController;

    AndroidBackNavigationBridge(AndroidBackNavigationController backNavigationController) {
        this.backNavigationController = backNavigationController;
    }

    @JavascriptInterface
    public void completeBackNavigation() {
        backNavigationController.completeBackNavigation();
    }
}
