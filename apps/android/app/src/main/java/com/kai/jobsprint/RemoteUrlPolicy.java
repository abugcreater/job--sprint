package com.kai.jobsprint;

import android.net.Uri;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

final class RemoteUrlPolicy {
    private static final Set<String> ALLOWED_REMOTE_HOSTS = new HashSet<>(Arrays.asList(
        "job-sprint.example.com",
        "203.0.113.10"
    ));
    private static final Set<String> ALLOWED_HTTP_REMOTE_HOSTS = new HashSet<>(Arrays.asList(
        "job-sprint.example.com",
        "203.0.113.10"
    ));

    private RemoteUrlPolicy() {
    }

    static String normalizeRemoteUrl(String value) {
        String url = value == null ? "" : value.trim();
        if (url.isEmpty()) {
            return "";
        }
        if (!url.endsWith("/schedule.html") && !url.contains("/job-sprint/")) {
            if (url.endsWith("/")) {
                return url + "job-sprint/react/index.html#/today";
            }
            return url + "/job-sprint/react/index.html#/today";
        }
        return url;
    }

    static boolean isAllowedRemoteHost(String host) {
        return ALLOWED_REMOTE_HOSTS.contains(host);
    }

    static boolean isAllowedRemoteHost(String host, String configuredRemoteUrl) {
        return isAllowedRemoteHost(host) || hostMatchesConfiguredUrl(host, configuredRemoteUrl);
    }

    static boolean isUsableHttpsUrl(String url) {
        return isUsableRemoteUrl(url) && "https".equalsIgnoreCase(Uri.parse(url).getScheme());
    }

    static boolean isUsableRemoteUrl(String url) {
        if (url == null || url.contains("your-domain.example.com")) {
            return false;
        }
        Uri parsed = Uri.parse(url);
        String path = parsed.getPath();
        return isUsableRemoteSchemeAndHost(parsed) && isConfiguredRemoteAppPath(path);
    }

    static String loginUrlFor(String url) {
        String remoteUrl = normalizeRemoteUrl(url);
        if (!isUsableRemoteUrl(remoteUrl)) {
            return "";
        }
        Uri parsed = Uri.parse(remoteUrl);
        String next = "/job-sprint/react/index.html#/today";
        String path = parsed.getPath();
        if (path != null && path.endsWith("/schedule.html")) {
            next = "/job-sprint/schedule.html";
        }
        return new Uri.Builder()
            .scheme(parsed.getScheme())
            .encodedAuthority(parsed.getEncodedAuthority())
            .path("/job-sprint/login.html")
            .appendQueryParameter("next", next)
            .build()
            .toString();
    }

    static boolean isAllowedWebViewUrl(String url, String configuredRemoteUrl) {
        if (url == null || url.isEmpty()) {
            return false;
        }
        if (url.startsWith("file:///android_asset/")) {
            return true;
        }
        Uri parsed = Uri.parse(url);
        return isAllowedConfiguredRemoteSchemeAndHost(parsed, configuredRemoteUrl)
            && isAllowedRemoteNavigationPath(parsed.getPath());
    }

    private static boolean isUsableRemoteSchemeAndHost(Uri parsed) {
        if (parsed == null || parsed.getHost() == null || parsed.getHost().trim().isEmpty()) {
            return false;
        }
        String scheme = parsed.getScheme();
        return "https".equalsIgnoreCase(scheme) || "http".equalsIgnoreCase(scheme);
    }

    private static boolean isAllowedConfiguredRemoteSchemeAndHost(Uri parsed, String configuredRemoteUrl) {
        if (parsed == null) {
            return false;
        }
        String scheme = parsed.getScheme();
        String host = parsed.getHost();
        boolean allowedScheme = "https".equalsIgnoreCase(scheme)
            || ("http".equalsIgnoreCase(scheme) && ALLOWED_HTTP_REMOTE_HOSTS.contains(host));
        return (allowedScheme && isAllowedRemoteHost(host))
            || (isUsableRemoteSchemeAndHost(parsed) && hostMatchesConfiguredUrl(host, configuredRemoteUrl));
    }

    private static boolean hostMatchesConfiguredUrl(String host, String configuredRemoteUrl) {
        if (host == null || configuredRemoteUrl == null || configuredRemoteUrl.trim().isEmpty()) {
            return false;
        }
        Uri configured = Uri.parse(normalizeRemoteUrl(configuredRemoteUrl));
        String configuredHost = configured.getHost();
        return configuredHost != null && configuredHost.equalsIgnoreCase(host);
    }

    private static boolean isConfiguredRemoteAppPath(String path) {
        return path != null && (path.contains("/job-sprint/") || path.endsWith("/schedule.html"));
    }

    private static boolean isAllowedRemoteNavigationPath(String path) {
        if (path == null) {
            return false;
        }
        return isConfiguredRemoteAppPath(path)
            || "/login.html".equals(path)
            || "/schedule.html".equals(path)
            || path.startsWith("/react/")
            || path.startsWith("/assets/")
            || path.startsWith("/data/")
            || path.startsWith("/api/");
    }
}
