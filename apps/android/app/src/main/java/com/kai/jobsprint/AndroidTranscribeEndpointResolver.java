package com.kai.jobsprint;

import android.net.Uri;

final class AndroidTranscribeEndpointResolver {
    private final RemoteWebViewController remoteWebViewController;

    AndroidTranscribeEndpointResolver(RemoteWebViewController remoteWebViewController) {
        this.remoteWebViewController = remoteWebViewController;
    }

    String resolve() {
        String fromCurrent = endpointFromPageUrl(remoteWebViewController.lastLoadedUrl());
        if (!fromCurrent.isEmpty()) {
            return fromCurrent;
        }
        String configuredRemoteUrl = remoteWebViewController.getConfiguredRemoteUrl();
        if (!RemoteUrlPolicy.isUsableRemoteUrl(configuredRemoteUrl)) {
            return "";
        }
        return endpointFromPageUrl(configuredRemoteUrl);
    }

    String endpointFromPageUrl(String rawUrl) {
        if (rawUrl == null || rawUrl.trim().isEmpty()) {
            return "";
        }
        if (rawUrl.contains("your-domain.example.com")) {
            return "";
        }
        Uri uri = Uri.parse(rawUrl);
        String scheme = uri.getScheme();
        if (!"https".equalsIgnoreCase(scheme) && !"http".equalsIgnoreCase(scheme)) {
            return "";
        }
        String authority = uri.getEncodedAuthority();
        if (authority == null || authority.isEmpty()) {
            return "";
        }
        String path = uri.getPath() == null ? "" : uri.getPath();
        String prefix = path.startsWith("/job-sprint/") || "/job-sprint".equals(path) ? "/job-sprint" : "";
        return scheme + "://" + authority + prefix + "/api/transcribe";
    }
}
