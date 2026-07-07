const assert = require("assert");
const fs = require("fs");

const recorder = fs.readFileSync("apps/android/app/src/main/java/com/kai/jobsprint/AndroidRecorderBridge.java", "utf8");
const resolver = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidTranscribeEndpointResolver.java",
  "utf8"
);

assert.match(resolver, /final class AndroidTranscribeEndpointResolver/);
assert.match(resolver, /private final RemoteWebViewController remoteWebViewController/);
assert.match(resolver, /AndroidTranscribeEndpointResolver\(RemoteWebViewController remoteWebViewController\)/);
assert.match(resolver, /String resolve\(\)/);
assert.match(resolver, /remoteWebViewController\.lastLoadedUrl\(\)/);
assert.match(resolver, /remoteWebViewController\.getConfiguredRemoteUrl\(\)/);
assert.match(resolver, /RemoteUrlPolicy\.isUsableRemoteUrl\(configuredRemoteUrl\)/);
assert.match(resolver, /String endpointFromPageUrl\(String rawUrl\)/);
assert.match(resolver, /Uri\.parse\(rawUrl\)/);
assert.match(resolver, /your-domain\.example\.com/);
assert.match(resolver, /"https"\.equalsIgnoreCase\(scheme\) && !"http"\.equalsIgnoreCase\(scheme\)/);
assert.match(resolver, /path\.startsWith\("\/job-sprint\/"\) \|\| "\/job-sprint"\.equals\(path\)/);
assert.match(resolver, /return scheme \+ ":\/\/" \+ authority \+ prefix \+ "\/api\/transcribe"/);

assert.match(recorder, /private final AndroidTranscribeEndpointResolver endpointResolver/);
assert.match(recorder, /this\.endpointResolver = new AndroidTranscribeEndpointResolver\(remoteWebViewController\)/);
assert.match(recorder, /lastEndpointConfigured = !endpointResolver\.resolve\(\)\.isEmpty\(\)/);
assert.match(recorder, /String endpoint = endpointResolver\.resolve\(\)/);
assert.doesNotMatch(recorder, /endpointFromPageUrl/);
assert.doesNotMatch(recorder, /Uri\.parse/);
assert.doesNotMatch(recorder, /RemoteUrlPolicy\.isUsableHttpsUrl/);
assert.doesNotMatch(recorder, /lastLoadedUrl\(\)/);
assert.doesNotMatch(recorder, /getConfiguredRemoteUrl\(\)/);

console.log("android transcribe endpoint resolver tests passed");
