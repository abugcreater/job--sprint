package com.kai.jobsprint;

import android.content.Intent;
import android.content.pm.PackageManager;

final class AndroidActivityLifecycleController {
    private final AndroidSpeechBridge speechBridge;
    private final AndroidRecorderBridge recorderBridge;
    private final AndroidFileChooserController fileChooserController;
    private final int audioPermissionRequest;
    private final AndroidBackNavigationController backNavigationController;

    AndroidActivityLifecycleController(
        AndroidSpeechBridge speechBridge,
        AndroidRecorderBridge recorderBridge,
        AndroidFileChooserController fileChooserController,
        int audioPermissionRequest,
        AndroidBackNavigationController backNavigationController
    ) {
        this.speechBridge = speechBridge;
        this.recorderBridge = recorderBridge;
        this.fileChooserController = fileChooserController;
        this.audioPermissionRequest = audioPermissionRequest;
        this.backNavigationController = backNavigationController;
    }

    boolean onActivityResult(int requestCode, int resultCode, Intent data) {
        return fileChooserController != null && fileChooserController.onActivityResult(requestCode, resultCode, data);
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
        if (fileChooserController != null) {
            fileChooserController.cancelPendingRequest();
        }
        if (backNavigationController != null) {
            backNavigationController.destroy();
        }
    }

    boolean handleBackPressed() {
        return backNavigationController != null && backNavigationController.requestSystemBack();
    }
}
