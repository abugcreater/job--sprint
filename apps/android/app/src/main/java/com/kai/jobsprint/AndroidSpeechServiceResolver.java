package com.kai.jobsprint;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.os.Build;
import android.provider.Settings;
import android.speech.RecognitionService;
import android.speech.SpeechRecognizer;
import android.util.Log;

import java.util.ArrayList;
import java.util.List;

final class AndroidSpeechServiceResolver {
    private static final String TAG = "JobSprintSpeech";

    private final Activity activity;

    AndroidSpeechServiceResolver(Activity activity) {
        this.activity = activity;
    }

    boolean isAvailable() {
        return SpeechRecognizer.isRecognitionAvailable(activity) && !queryRecognitionServices().isEmpty();
    }

    int recognitionServiceCount() {
        return queryRecognitionServices().size();
    }

    ComponentName selectedRecognitionService() {
        ArrayList<ComponentName> services = queryRecognitionServices();
        if (services.isEmpty()) {
            Log.w(TAG, "no queryable RecognitionService found");
            return null;
        }
        ComponentName defaultService = defaultVoiceRecognitionService();
        if (defaultService != null && services.contains(defaultService)) {
            Log.i(TAG, "using default recognition service: " + defaultService.flattenToShortString());
            return defaultService;
        }
        ComponentName fallback = services.get(0);
        if (defaultService == null) {
            Log.w(TAG, "no default voice recognition service selected; using first queryable service: " + fallback.flattenToShortString());
        } else {
            Log.w(TAG, "default voice recognition service is not queryable; using first queryable service: " + fallback.flattenToShortString());
        }
        return fallback;
    }

    String componentToShortString(ComponentName component) {
        return component == null ? "" : component.flattenToShortString();
    }

    private ArrayList<ComponentName> queryRecognitionServices() {
        ArrayList<ComponentName> components = new ArrayList<>();
        Intent serviceIntent = new Intent(RecognitionService.SERVICE_INTERFACE);
        int flags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PackageManager.MATCH_ALL : 0;
        List<ResolveInfo> services = activity.getPackageManager().queryIntentServices(serviceIntent, flags);
        if (services == null || services.isEmpty()) {
            return components;
        }
        for (ResolveInfo service : services) {
            if (service.serviceInfo == null) {
                continue;
            }
            components.add(new ComponentName(service.serviceInfo.packageName, service.serviceInfo.name));
        }
        return components;
    }

    private ComponentName defaultVoiceRecognitionService() {
        String serviceName = Settings.Secure.getString(activity.getContentResolver(), "voice_recognition_service");
        if (serviceName == null || serviceName.trim().isEmpty()) {
            return null;
        }
        return ComponentName.unflattenFromString(serviceName);
    }
}
