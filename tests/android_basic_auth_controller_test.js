const assert = require("assert");
const fs = require("fs");

const activity = fs.readFileSync("apps/android/app/src/main/java/com/kai/jobsprint/MainActivity.java", "utf8");
const startup = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidAppStartupController.java",
  "utf8"
);
const controller = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidBasicAuthController.java",
  "utf8"
);
const remoteWebViewClient = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidRemoteWebViewClient.java",
  "utf8"
);
const initializer = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidWebViewInitializer.java",
  "utf8"
);

assert.match(controller, /final class AndroidBasicAuthController/);
assert.match(controller, /private final Activity activity/);
assert.match(controller, /private final AuthCredentialStore credentialStore/);
assert.match(controller, /private final RemoteWebViewController remoteWebViewController/);
assert.match(controller, /void handleHttpAuthRequest\(HttpAuthHandler handler, String host, String realm\)/);
assert.match(controller, /remoteWebViewController\.isAllowedRemoteHost\(host\)/);
assert.match(controller, /handler\.cancel\(\)/);
assert.match(controller, /remoteWebViewController\.loadFallback\("拦截未授权远端认证域名"\)/);
assert.match(controller, /private boolean trySavedBasicAuth/);
assert.match(controller, /credentialStore\.hasAttemptedSavedAuth\(host, realm\)/);
assert.match(controller, /credentialStore\.markSavedAuthAttempted\(host, realm\)/);
assert.match(controller, /handler\.proceed\(savedAuth\.user, savedAuth\.password\)/);
assert.match(controller, /private void showBasicAuthDialog/);
assert.match(controller, /new AlertDialog\.Builder\(activity\)/);
assert.match(controller, /\.setTitle\("登录 job-sprint"\)/);
assert.match(controller, /credentialStore\.saveBasicAuth\(userValue, passwordValue\)/);
assert.match(controller, /credentialStore\.clearBasicAuth\(\)/);
assert.match(controller, /remoteWebViewController\.loadFallback\("未完成认证"\)/);

assert.match(startup, /AndroidBasicAuthController basicAuthController = new AndroidBasicAuthController\(/);
assert.match(initializer, /new AndroidRemoteWebViewClient\(basicAuthController, remoteWebViewController\)/);
assert.match(remoteWebViewClient, /basicAuthController\.handleHttpAuthRequest\(handler, host, realm\)/);
assert.doesNotMatch(activity, /AndroidBasicAuthController/);
assert.doesNotMatch(activity, /basicAuthController/);
assert.doesNotMatch(activity, /basicAuthController\.handleHttpAuthRequest\(handler, host, realm\)/);
assert.doesNotMatch(activity, /private void showBasicAuthDialog/);
assert.doesNotMatch(activity, /private boolean trySavedBasicAuth/);
assert.doesNotMatch(activity, /new AlertDialog\.Builder/);
assert.doesNotMatch(activity, /setTitle\("登录 job-sprint"\)/);
assert.doesNotMatch(activity, /credentialStore\.saveBasicAuth/);
assert.doesNotMatch(activity, /credentialStore\.clearBasicAuth/);
assert.doesNotMatch(activity, /credentialStore\.hasAttemptedSavedAuth/);
assert.doesNotMatch(activity, /AuthCredentialStore\.BasicAuthCredentials/);
assert.doesNotMatch(activity, /InputType\.TYPE_TEXT_VARIATION_PASSWORD/);
assert.doesNotMatch(activity, /new CheckBox/);

assert.doesNotMatch(controller, /setWebViewClient/);
assert.doesNotMatch(controller, /setWebChromeClient/);
assert.doesNotMatch(controller, /addJavascriptInterface/);

console.log("android basic auth controller tests passed");
