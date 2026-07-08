const assert = require("assert");
const fs = require("fs");

const activity = fs.readFileSync("apps/android/app/src/main/java/com/kai/jobsprint/MainActivity.java", "utf8");
const controller = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/RemoteWebViewController.java",
  "utf8",
);
const basicAuthController = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidBasicAuthController.java",
  "utf8",
);
const remoteWebViewClient = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidRemoteWebViewClient.java",
  "utf8",
);
const policy = fs.readFileSync("apps/android/app/src/main/java/com/kai/jobsprint/RemoteUrlPolicy.java", "utf8");
const strings = fs.readFileSync("apps/android/app/src/main/res/values/strings.xml", "utf8");
const manifest = fs.readFileSync("apps/android/app/src/main/AndroidManifest.xml", "utf8");

assert.match(policy, /final class RemoteUrlPolicy/);
assert.match(policy, /ALLOWED_REMOTE_HOSTS[\s\S]*job-sprint\.example\.com/);
assert.match(policy, /ALLOWED_REMOTE_HOSTS[\s\S]*203\.0\.113\.10/);
assert.match(policy, /ALLOWED_HTTP_REMOTE_HOSTS[\s\S]*203\.0\.113\.10/);
assert.match(policy, /static String normalizeRemoteUrl\(String value\)/);
assert.match(policy, /job-sprint\/react\/index\.html#\/today/);
assert.match(policy, /static boolean isUsableHttpsUrl\(String url\)/);
assert.match(policy, /static boolean isUsableRemoteUrl\(String url\)/);
assert.match(policy, /static boolean isAllowedRemoteHost\(String host, String configuredRemoteUrl\)/);
assert.match(policy, /your-domain\.example\.com/);
assert.match(policy, /"http"\.equalsIgnoreCase\(scheme\)/);
assert.match(policy, /isConfiguredRemoteAppPath\(path\)/);
assert.match(policy, /path\.contains\("\/job-sprint\/"\)/);
assert.match(policy, /path\.endsWith\("\/schedule\.html"\)/);
assert.match(policy, /static String loginUrlFor\(String url\)/);
assert.match(policy, /isUsableRemoteUrl\(remoteUrl\)/);
assert.match(policy, /\.path\("\/job-sprint\/login\.html"\)/);
assert.match(policy, /\.appendQueryParameter\("next", next\)/);
assert.match(policy, /"\/job-sprint\/react\/index\.html#\/today"/);
assert.match(policy, /"\/job-sprint\/schedule\.html"/);
assert.match(policy, /static boolean isAllowedWebViewUrl\(String url, String configuredRemoteUrl\)/);
assert.match(policy, /url\.startsWith\("file:\/\/\/android_asset\/"\)/);
assert.match(policy, /isAllowedConfiguredRemoteSchemeAndHost\(parsed, configuredRemoteUrl\)/);
assert.match(policy, /hostMatchesConfiguredUrl\(host, configuredRemoteUrl\)/);
assert.match(policy, /isAllowedRemoteNavigationPath\(parsed\.getPath\(\)\)/);
assert.match(policy, /"\/login\.html"\.equals\(path\)/);
assert.match(policy, /path\.startsWith\("\/react\/"\)/);
assert.match(policy, /path\.startsWith\("\/api\/"\)/);
assert.match(strings, /https:\/\/job-sprint\.example\.com\/job-sprint\/react\/index\.html#\/today/);
assert.match(manifest, /android:usesCleartextTraffic="true"/);

assert.match(controller, /RemoteUrlPolicy\.normalizeRemoteUrl/);
assert.match(controller, /RemoteUrlPolicy\.isUsableRemoteUrl/);
assert.match(controller, /RemoteUrlPolicy\.loginUrlFor/);
assert.match(controller, /RemoteUrlPolicy\.isAllowedWebViewUrl\(url, getConfiguredRemoteUrl\(\)\)/);
assert.match(controller, /RemoteUrlPolicy\.isAllowedRemoteHost\(host, getConfiguredRemoteUrl\(\)\)/);
assert.match(remoteWebViewClient, /remoteWebViewController\.isAllowedWebViewUrl/);
assert.doesNotMatch(activity, /RemoteUrlPolicy\.isAllowedWebViewUrl/);
assert.match(basicAuthController, /remoteWebViewController\.isAllowedRemoteHost/);
assert.doesNotMatch(activity, /RemoteUrlPolicy\.isAllowedRemoteHost/);
assert.doesNotMatch(activity, /ALLOWED_REMOTE_HOSTS\s*=/);
assert.doesNotMatch(activity, /private String normalizeRemoteUrl\(String value\)/);

console.log("android remote url policy tests passed");
