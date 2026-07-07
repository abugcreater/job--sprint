package com.kai.jobsprint;

import android.content.pm.PackageManager;
import android.webkit.WebView;

final class AndroidActivityLifecycleController {
    private final WebView webView;
    private final AndroidSpeechBridge speechBridge;
    private final AndroidRecorderBridge recorderBridge;
    private final int audioPermissionRequest;

    AndroidActivityLifecycleController(
        WebView webView,
        AndroidSpeechBridge speechBridge,
        AndroidRecorderBridge recorderBridge,
        int audioPermissionRequest
    ) {
        this.webView = webView;
        this.speechBridge = speechBridge;
        this.recorderBridge = recorderBridge;
        this.audioPermissionRequest = audioPermissionRequest;
    }

    void onAudioPermissionResult(int requestCode, int[] grantResults) {
        if (requestCode != audioPermissionRequest || speechBridge == null) {
            return;
        }
        boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
        speechBridge.onAudioPermissionResult(granted);
        if (recorderBridge != null) {
            recorderBridge.onAudioPermissionResult(granted);
        }
    }

    void onPause() {
        if (speechBridge != null) {
            speechBridge.cancelFromLifecycle();
        }
        if (recorderBridge != null) {
            recorderBridge.cancelFromLifecycle();
        }
    }

    void onDestroy() {
        if (speechBridge != null) {
            speechBridge.destroy();
        }
        if (recorderBridge != null) {
            recorderBridge.destroy();
        }
        if (webView != null) {
            webView.destroy();
        }
    }

    boolean handleBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return false;
    }
}
