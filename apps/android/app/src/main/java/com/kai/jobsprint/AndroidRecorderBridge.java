package com.kai.jobsprint;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.media.MediaRecorder;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import org.json.JSONObject;

import java.io.File;

final class AndroidRecorderBridge {
    private final Activity activity;
    private final WebView webView;
    private final RemoteWebViewController remoteWebViewController;
    private final int audioPermissionRequest;
    private final AndroidTranscribeEndpointResolver endpointResolver;
    private final AndroidRecorderUploader recorderUploader;

    private MediaRecorder recorder;
    private File recordingFile;
    private boolean recording = false;
    private boolean pendingStartAfterPermission = false;
    private volatile boolean lastEndpointConfigured = false;

    AndroidRecorderBridge(
        Activity activity,
        WebView webView,
        RemoteWebViewController remoteWebViewController,
        int audioPermissionRequest
    ) {
        this.activity = activity;
        this.webView = webView;
        this.remoteWebViewController = remoteWebViewController;
        this.audioPermissionRequest = audioPermissionRequest;
        this.endpointResolver = new AndroidTranscribeEndpointResolver(remoteWebViewController);
        this.recorderUploader = new AndroidRecorderUploader();
    }

    @JavascriptInterface
    public boolean isAvailable() {
        lastEndpointConfigured = !endpointResolver.resolve().isEmpty();
        return lastEndpointConfigured;
    }

    @JavascriptInterface
    public String getStatus() {
        JSONObject payload = basePayload(recording ? "recording" : "idle", recording ? "正在录音" : "空闲");
        put(payload, "available", isAvailable());
        put(payload, "recording", recording);
        put(payload, "endpointConfigured", lastEndpointConfigured);
        return payload.toString();
    }

    @JavascriptInterface
    public void startRecording() {
        activity.runOnUiThread(() -> {
            if (!isAvailable()) {
                emitError("ERROR_TRANSCRIBE_ENDPOINT", "当前页面没有可用的转写服务地址，可继续手动输入。", false);
                return;
            }
            if (recording) {
                emitState("recording", "正在录音，请说完后点击停止。");
                return;
            }
            if (activity.checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                pendingStartAfterPermission = true;
                emitState("requesting_permission", "正在请求麦克风权限。");
                activity.requestPermissions(new String[] { Manifest.permission.RECORD_AUDIO }, audioPermissionRequest);
                return;
            }
            startRecorderInternal();
        });
    }

    @JavascriptInterface
    public void stopAndTranscribe() {
        activity.runOnUiThread(() -> {
            if (!recording || recorder == null || recordingFile == null) {
                emitState("idle", "录音未在进行中。");
                return;
            }
            File file = recordingFile;
            try {
                recorder.stop();
            } catch (RuntimeException error) {
                releaseRecorder();
                deleteQuietly(file);
                emitError("ERROR_RECORDING_TOO_SHORT", "录音太短或未采集到声音，请手动输入或重新录音。", true);
                return;
            }
            releaseRecorder();
            recordingFile = null;
            emitState("uploading", "录音已停止，正在上传转写。");
            String endpoint = endpointResolver.resolve();
            lastEndpointConfigured = !endpoint.isEmpty();
            recorderUploader.upload(file, endpoint, new AndroidRecorderUploader.Callback() {
                @Override
                public void onTranscription(String text, String message) {
                    emitTranscription(text, message);
                }

                @Override
                public void onError(String code, String message, boolean retryable) {
                    emitError(code, message, retryable);
                }
            });
        });
    }

    void onAudioPermissionResult(boolean granted) {
        if (!pendingStartAfterPermission) {
            return;
        }
        pendingStartAfterPermission = false;
        if (!granted) {
            emitError("ERROR_INSUFFICIENT_PERMISSIONS", "未授予麦克风权限。请到系统设置中允许 job-sprint 使用麦克风。", false);
            return;
        }
        startRecorderInternal();
    }

    void cancelFromLifecycle() {
        if (recording) {
            releaseRecorder();
            deleteQuietly(recordingFile);
            emitState("idle", "App 已进入后台，录音已取消。");
        }
    }

    void destroy() {
        releaseRecorder();
        deleteQuietly(recordingFile);
    }

    private void startRecorderInternal() {
        try {
            recordingFile = File.createTempFile("job-sprint-answer-", ".m4a", activity.getCacheDir());
            recorder = new MediaRecorder();
            recorder.setAudioSource(MediaRecorder.AudioSource.MIC);
            recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
            recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
            recorder.setAudioEncodingBitRate(96_000);
            recorder.setAudioSamplingRate(44_100);
            recorder.setOutputFile(recordingFile.getAbsolutePath());
            recorder.prepare();
            recorder.start();
            recording = true;
            emitState("recording", "正在录音，说完后点击停止上传转写。");
        } catch (Exception error) {
            releaseRecorder();
            deleteQuietly(recordingFile);
            emitError("ERROR_RECORDING_START", "录音启动失败，请检查麦克风权限或手动输入。", true);
        }
    }

    private void releaseRecorder() {
        if (recorder != null) {
            try {
                recorder.reset();
                recorder.release();
            } catch (Exception ignored) {
                // Best effort cleanup only.
            }
        }
        recorder = null;
        recording = false;
    }

    private void deleteQuietly(File file) {
        if (file != null && file.exists()) {
            file.delete();
        }
        if (file == recordingFile) {
            recordingFile = null;
        }
    }

    private void emitState(String state, String message) {
        evaluatePayload("window.onAndroidRecordingState", basePayload(state, message));
    }

    private void emitError(String code, String message, boolean retryable) {
        JSONObject payload = basePayload("error", message);
        put(payload, "code", code);
        put(payload, "retryable", retryable);
        evaluatePayload("window.onAndroidRecordingError", payload);
    }

    private void emitTranscription(String text, String message) {
        JSONObject payload = basePayload("final", message);
        put(payload, "text", text == null ? "" : text);
        evaluatePayload("window.onAndroidRecordingFinal", payload);
    }

    private JSONObject basePayload(String state, String message) {
        JSONObject payload = new JSONObject();
        put(payload, "state", state);
        put(payload, "source", "android-record-upload-asr");
        put(payload, "message", message == null ? "" : message);
        put(payload, "recording", recording);
        put(payload, "endpointConfigured", lastEndpointConfigured);
        return payload;
    }

    private void put(JSONObject payload, String key, Object value) {
        try {
            payload.put(key, value);
        } catch (Exception ignored) {
            // Do not let diagnostic payload formatting break recorder callbacks.
        }
    }

    private void evaluatePayload(String method, JSONObject payload) {
        if (webView == null) {
            return;
        }
        activity.runOnUiThread(() -> {
            String script = method + " && " + method + "(" + payload.toString() + ");";
            webView.evaluateJavascript(script, null);
        });
    }
}
