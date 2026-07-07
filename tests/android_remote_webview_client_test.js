const assert = require("assert");
const fs = require("fs");

const activity = fs.readFileSync("apps/android/app/src/main/java/com/kai/jobsprint/MainActivity.java", "utf8");
const initializer = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidWebViewInitializer.java",
  "utf8"
);
const client = fs.readFileSync("apps/android/app/src/main/java/com/kai/jobsprint/AndroidRemoteWebViewClient.java", "utf8");

assert.match(client, /final class AndroidRemoteWebViewClient extends WebViewClient/);
assert.match(client, /private final AndroidBasicAuthController basicAuthController/);
assert.match(client, /private final RemoteWebViewController remoteWebViewController/);
assert.match(client, /public void onReceivedHttpAuthRequest\(WebView view, HttpAuthHandler handler, String host, String realm\)/);
assert.match(client, /basicAuthController\.handleHttpAuthRequest\(handler, host, realm\)/);
assert.match(client, /public boolean shouldOverrideUrlLoading\(WebView view, WebResourceRequest request\)/);
assert.match(client, /RemoteUrlPolicy\.isAllowedWebViewUrl\(uri\.toString\(\)\)/);
assert.match(client, /remoteWebViewController\.loadFallback\("拦截未授权远端页面"\)/);
assert.match(client, /remoteWebViewController\.setLastLoadedUrl\(url\)/);
assert.match(client, /public WebResourceResponse shouldInterceptRequest\(WebView view, WebResourceRequest request\)/);
assert.match(client, /public void onReceivedError\(WebView view, WebResourceRequest request, WebResourceError error\)/);
assert.match(client, /remoteWebViewController\.isFallbackLoaded\(\)/);
assert.match(client, /request\.isForMainFrame\(\)/);
assert.match(client, /remoteWebViewController\.loadFallback\("远端页面不可用"\)/);
assert.match(client, /public void onReceivedSslError\(WebView view, SslErrorHandler handler, SslError error\)/);
assert.match(client, /handler\.cancel\(\)/);
assert.match(client, /remoteWebViewController\.loadFallback\("HTTPS 证书校验失败"\)/);
assert.ok(!/onReceivedSslError[\s\S]{0,180}handler\.proceed\(\)/.test(client), "SSL errors must not be bypassed");

assert.match(initializer, /webView\.setWebViewClient\(new AndroidRemoteWebViewClient\(basicAuthController, remoteWebViewController\)\)/);
assert.doesNotMatch(activity, /setWebViewClient/);
assert.doesNotMatch(activity, /new WebViewClient\(\)/);
assert.doesNotMatch(activity, /onReceivedHttpAuthRequest\(WebView view, HttpAuthHandler handler, String host, String realm\)/);
assert.doesNotMatch(activity, /shouldOverrideUrlLoading\(WebView view, WebResourceRequest request\)/);
assert.doesNotMatch(activity, /onReceivedSslError\(WebView view, SslErrorHandler handler, SslError error\)/);
assert.doesNotMatch(activity, /RemoteUrlPolicy\.isAllowedWebViewUrl/);
assert.doesNotMatch(activity, /loadFallback\("拦截未授权远端页面"\)/);
assert.doesNotMatch(activity, /loadFallback\("远端页面不可用"\)/);
assert.doesNotMatch(activity, /loadFallback\("HTTPS 证书校验失败"\)/);

assert.doesNotMatch(client, /setWebChromeClient/);
assert.doesNotMatch(client, /addJavascriptInterface/);
assert.doesNotMatch(client, /requestPermissions/);

console.log("android remote webview client tests passed");
