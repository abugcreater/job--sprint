package com.kai.jobsprint;

import android.app.Activity;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

final class AndroidAuthSettingsBridge {
    private final Activity activity;
    private final AuthCredentialStore credentialStore;

    AndroidAuthSettingsBridge(Activity activity, AuthCredentialStore credentialStore) {
        this.activity = activity;
        this.credentialStore = credentialStore;
    }

    @JavascriptInterface
    public boolean hasSavedBasicAuth() {
        return credentialStore.hasBasicAuth();
    }

    @JavascriptInterface
    public void clearBasicAuth() {
        activity.runOnUiThread(() -> {
            credentialStore.clearBasicAuth();
            Toast.makeText(activity, "已清除本机 Basic Auth 凭据", Toast.LENGTH_SHORT).show();
        });
    }
}
