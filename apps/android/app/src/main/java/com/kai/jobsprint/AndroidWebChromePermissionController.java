package com.kai.jobsprint;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.util.Log;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebView;

final class AndroidWebChromePermissionController extends WebChromeClient {
    private static final String TAG = "JobSprintSpeech";

    private final Activity activity;
    private final int audioPermissionRequest;
    private final AndroidFileChooserController fileChooserController;

    AndroidWebChromePermissionController(
        Activity activity,
        int audioPermissionRequest,
        AndroidFileChooserController fileChooserController
    ) {
        this.activity = activity;
        this.audioPermissionRequest = audioPermissionRequest;
        this.fileChooserController = fileChooserController;
    }

    @Override
    public boolean onShowFileChooser(
        WebView webView,
        ValueCallback<Uri[]> filePathCallback,
        FileChooserParams fileChooserParams
    ) {
        return fileChooserController.showFileChooser(filePathCallback, fileChooserParams);
    }

    @Override
    public void onPermissionRequest(PermissionRequest request) {
        activity.runOnUiThread(() -> handlePermissionRequest(request));
    }

    private void handlePermissionRequest(PermissionRequest request) {
        if (!requestsAudioCapture(request)) {
            request.deny();
            return;
        }
        if (activity.checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
            request.grant(new String[] { PermissionRequest.RESOURCE_AUDIO_CAPTURE });
            return;
        }
        Log.i(TAG, "WebView requested audio capture permission");
        activity.requestPermissions(new String[] { Manifest.permission.RECORD_AUDIO }, audioPermissionRequest);
        request.deny();
    }

    private boolean requestsAudioCapture(PermissionRequest request) {
        for (String resource : request.getResources()) {
            if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) {
                return true;
            }
        }
        return false;
    }
}
