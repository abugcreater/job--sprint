package com.kai.jobsprint;

import android.app.Activity;
import android.os.Bundle;

public class MainActivity extends Activity {
    private static final int AUDIO_PERMISSION_REQUEST = 1001;
    private static final boolean LOAD_REMOTE_BY_DEFAULT = true;
    static final String EXTRA_FORCE_LOCAL_START = "com.kai.jobsprint.FORCE_LOCAL_START";
    private AndroidActivityLifecycleController lifecycleController;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        boolean loadRemoteByDefault = LOAD_REMOTE_BY_DEFAULT
            && !getIntent().getBooleanExtra(EXTRA_FORCE_LOCAL_START, false);
        lifecycleController = new AndroidAppStartupController(
            this,
            AUDIO_PERMISSION_REQUEST,
            loadRemoteByDefault
        ).start();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (lifecycleController != null) {
            lifecycleController.onAudioPermissionResult(requestCode, grantResults);
        }
    }

    @Override
    protected void onDestroy() {
        if (lifecycleController != null) {
            lifecycleController.onDestroy();
        }
        super.onDestroy();
    }

    @Override
    protected void onPause() {
        if (lifecycleController != null) {
            lifecycleController.onPause();
        }
        super.onPause();
    }

    @Override
    public void onBackPressed() {
        if (lifecycleController != null && lifecycleController.handleBackPressed()) {
            return;
        }
        super.onBackPressed();
    }

}
