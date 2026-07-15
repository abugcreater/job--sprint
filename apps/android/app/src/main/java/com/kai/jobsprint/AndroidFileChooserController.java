package com.kai.jobsprint;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.util.Log;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;

final class AndroidFileChooserController {
    private static final String TAG = "JobSprintFiles";
    private static final int FILE_CHOOSER_REQUEST = 1002;

    private final Activity activity;
    private ValueCallback<Uri[]> pendingFileCallback;

    AndroidFileChooserController(Activity activity) {
        this.activity = activity;
    }

    boolean showFileChooser(ValueCallback<Uri[]> callback, WebChromeClient.FileChooserParams params) {
        cancelPendingRequest();
        pendingFileCallback = callback;
        try {
            Intent chooserIntent = params.createIntent();
            chooserIntent.addCategory(Intent.CATEGORY_OPENABLE);
            activity.startActivityForResult(chooserIntent, FILE_CHOOSER_REQUEST);
        } catch (ActivityNotFoundException | SecurityException error) {
            Log.w(TAG, "No compatible document picker is available", error);
            completePendingRequest(null);
        }
        return true;
    }

    boolean onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode != FILE_CHOOSER_REQUEST) {
            return false;
        }
        Uri[] results = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
        completePendingRequest(results);
        return true;
    }

    void cancelPendingRequest() {
        completePendingRequest(null);
    }

    private void completePendingRequest(Uri[] results) {
        ValueCallback<Uri[]> callback = pendingFileCallback;
        pendingFileCallback = null;
        if (callback != null) {
            callback.onReceiveValue(results);
        }
    }
}
