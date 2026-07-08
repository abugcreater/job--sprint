package com.kai.jobsprint;

import android.app.Activity;
import android.app.AlertDialog;
import android.text.InputType;
import android.view.ViewGroup;
import android.webkit.HttpAuthHandler;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.LinearLayout;

final class AndroidBasicAuthController {
    private final Activity activity;
    private final AuthCredentialStore credentialStore;
    private final RemoteWebViewController remoteWebViewController;

    AndroidBasicAuthController(
        Activity activity,
        AuthCredentialStore credentialStore,
        RemoteWebViewController remoteWebViewController
    ) {
        this.activity = activity;
        this.credentialStore = credentialStore;
        this.remoteWebViewController = remoteWebViewController;
    }

    void handleHttpAuthRequest(HttpAuthHandler handler, String host, String realm) {
        if (!remoteWebViewController.isAllowedRemoteHost(host)) {
            handler.cancel();
            remoteWebViewController.loadFallback("拦截未授权远端认证域名");
            return;
        }
        if (!trySavedBasicAuth(handler, host, realm)) {
            showBasicAuthDialog(handler, host, realm);
        }
    }

    private boolean trySavedBasicAuth(HttpAuthHandler handler, String host, String realm) {
        AuthCredentialStore.BasicAuthCredentials savedAuth = credentialStore.basicAuth();
        if (savedAuth == null || credentialStore.hasAttemptedSavedAuth(host, realm)) {
            return false;
        }
        credentialStore.markSavedAuthAttempted(host, realm);
        handler.proceed(savedAuth.user, savedAuth.password);
        return true;
    }

    private void showBasicAuthDialog(HttpAuthHandler handler, String host, String realm) {
        LinearLayout layout = new LinearLayout(activity);
        layout.setOrientation(LinearLayout.VERTICAL);
        int padding = Math.round(20 * activity.getResources().getDisplayMetrics().density);
        layout.setPadding(padding, padding / 2, padding, 0);

        EditText username = new EditText(activity);
        username.setHint("用户名");
        username.setSingleLine(true);
        layout.addView(username, new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        ));

        EditText password = new EditText(activity);
        password.setHint("密码");
        password.setSingleLine(true);
        password.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        layout.addView(password, new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        ));

        AuthCredentialStore.BasicAuthCredentials savedAuth = credentialStore.basicAuth();
        if (savedAuth != null) {
            username.setText(savedAuth.user);
            password.setText(savedAuth.password);
        }

        CheckBox saveAuth = new CheckBox(activity);
        saveAuth.setText("保存到本机 App 私有数据");
        saveAuth.setChecked(true);
        layout.addView(saveAuth, new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        ));

        new AlertDialog.Builder(activity)
            .setTitle("登录 job-sprint")
            .setMessage(host)
            .setView(layout)
            .setPositiveButton("登录", (dialog, which) -> {
                String userValue = username.getText().toString();
                String passwordValue = password.getText().toString();
                if (saveAuth.isChecked()) {
                    credentialStore.saveBasicAuth(userValue, passwordValue);
                } else {
                    credentialStore.clearBasicAuth();
                }
                credentialStore.markSavedAuthAttempted(host, realm);
                handler.proceed(userValue, passwordValue);
            })
            .setNegativeButton("取消", (dialog, which) -> {
                handler.cancel();
                remoteWebViewController.loadFallback("未完成认证");
            })
            .setOnCancelListener((dialog) -> {
                handler.cancel();
                remoteWebViewController.loadFallback("未完成认证");
            })
            .show();
    }
}
