package com.kai.jobsprint;

import android.os.SystemClock;
import android.webkit.CookieManager;

import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

final class AndroidRecorderUploader {
    interface Callback {
        void onTranscription(String text, String message);

        void onError(String code, String message, boolean retryable);
    }

    void upload(File file, String endpoint, Callback callback) {
        new Thread(() -> {
            if (endpoint.isEmpty()) {
                deleteQuietly(file);
                callback.onError("ERROR_TRANSCRIBE_ENDPOINT", "当前页面没有可用的转写服务地址，可继续手动输入。", false);
                return;
            }
            HttpURLConnection connection = null;
            try {
                String boundary = "----JobSprintAudio" + SystemClock.elapsedRealtime();
                connection = (HttpURLConnection) new URL(endpoint).openConnection();
                connection.setConnectTimeout(15_000);
                connection.setReadTimeout(60_000);
                connection.setDoOutput(true);
                connection.setRequestMethod("POST");
                connection.setRequestProperty("content-type", "multipart/form-data; boundary=" + boundary);
                connection.setRequestProperty("accept", "application/json");
                String cookie = CookieManager.getInstance().getCookie(endpoint);
                if (cookie != null && !cookie.trim().isEmpty()) {
                    connection.setRequestProperty("cookie", cookie);
                }
                writeMultipartAudio(connection, boundary, file);
                int status = connection.getResponseCode();
                String body = readConnectionBody(connection, status);
                JSONObject response = body == null || body.isEmpty() ? new JSONObject() : new JSONObject(body);
                if (status >= 200 && status < 300 && response.optBoolean("ok", false)) {
                    String text = response.optString("text", "");
                    callback.onTranscription(text, "录音转写完成。");
                } else {
                    String message = response.optString("message", "录音已上传，但转写服务未返回文本。");
                    String code = response.optString("mode", response.optString("error", "ERROR_TRANSCRIBE_FAILED"));
                    callback.onError(code, message, true);
                }
            } catch (Exception error) {
                callback.onError("ERROR_TRANSCRIBE_UPLOAD", "录音上传或转写失败，可继续手动输入。", true);
            } finally {
                if (connection != null) {
                    connection.disconnect();
                }
                deleteQuietly(file);
            }
        }, "job-sprint-audio-upload").start();
    }

    private void writeMultipartAudio(HttpURLConnection connection, String boundary, File file) throws Exception {
        OutputStream output = connection.getOutputStream();
        output.write(("--" + boundary + "\r\n").getBytes("UTF-8"));
        output.write("Content-Disposition: form-data; name=\"audio\"; filename=\"answer.m4a\"\r\n".getBytes("UTF-8"));
        output.write("Content-Type: audio/mp4\r\n\r\n".getBytes("UTF-8"));
        FileInputStream input = new FileInputStream(file);
        byte[] buffer = new byte[8192];
        int read;
        while ((read = input.read(buffer)) != -1) {
            output.write(buffer, 0, read);
        }
        input.close();
        output.write(("\r\n--" + boundary + "--\r\n").getBytes("UTF-8"));
        output.flush();
        output.close();
    }

    private String readConnectionBody(HttpURLConnection connection, int status) throws Exception {
        java.io.InputStream stream = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
        if (stream == null) {
            return "";
        }
        byte[] buffer = new byte[4096];
        StringBuilder body = new StringBuilder();
        int read;
        while ((read = stream.read(buffer)) != -1) {
            body.append(new String(buffer, 0, read, "UTF-8"));
        }
        stream.close();
        return body.toString();
    }

    private void deleteQuietly(File file) {
        if (file != null && file.exists()) {
            file.delete();
        }
    }
}
