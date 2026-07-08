package com.kai.jobsprint;

import android.net.Uri;
import android.net.http.SslError;
import android.webkit.HttpAuthHandler;
import android.webkit.SslErrorHandler;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;

final class AndroidRemoteWebViewClient extends WebViewClient {
    private final AndroidBasicAuthController basicAuthController;
    private final RemoteWebViewController remoteWebViewController;

    AndroidRemoteWebViewClient(
        AndroidBasicAuthController basicAuthController,
        RemoteWebViewController remoteWebViewController
    ) {
        this.basicAuthController = basicAuthController;
        this.remoteWebViewController = remoteWebViewController;
    }

    @Override
    public void onReceivedHttpAuthRequest(WebView view, HttpAuthHandler handler, String host, String realm) {
        basicAuthController.handleHttpAuthRequest(handler, host, realm);
    }

    @Override
    public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        Uri uri = request.getUrl();
        if (uri != null && remoteWebViewController.isAllowedWebViewUrl(uri.toString())) {
            return false;
        }
        remoteWebViewController.loadFallback("拦截未授权远端页面");
        return true;
    }

    @Override
    public void onPageFinished(WebView view, String url) {
        remoteWebViewController.setLastLoadedUrl(url);
    }

    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        return super.shouldInterceptRequest(view, request);
    }

    @Override
    public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
        if (!remoteWebViewController.isFallbackLoaded() && request.isForMainFrame()) {
            remoteWebViewController.loadFallback("远端页面不可用");
        }
    }

    @Override
    public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
        handler.cancel();
        remoteWebViewController.loadFallback("HTTPS 证书校验失败");
    }
}
