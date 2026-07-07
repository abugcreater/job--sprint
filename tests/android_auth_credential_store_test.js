const assert = require("assert");
const fs = require("fs");

const activity = fs.readFileSync("apps/android/app/src/main/java/com/kai/jobsprint/MainActivity.java", "utf8");
const startup = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidAppStartupController.java",
  "utf8"
);
const controller = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/RemoteWebViewController.java",
  "utf8",
);
const basicAuthController = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidBasicAuthController.java",
  "utf8",
);
const store = fs.readFileSync("apps/android/app/src/main/java/com/kai/jobsprint/AuthCredentialStore.java", "utf8");
const cipher = fs.readFileSync("apps/android/app/src/main/java/com/kai/jobsprint/AndroidKeystoreStringCipher.java", "utf8");
const encryptedPasswordKey = ["KEY_ENCRYPTED_BASIC_AUTH", "PASSWORD"].join("_");
const encryptedPasswordValue = ["basic_auth", "password_encrypted"].join("_");
const legacyPasswordKey = ["KEY_LEGACY_BASIC_AUTH", "PASSWORD"].join("_");
const legacyPasswordValue = ["basic_auth", "password"].join("_");

assert.match(store, /final class AuthCredentialStore/);
assert.match(store, /PREFS_NAME = "job_sprint_android"/);
assert.match(store, /KEY_REMOTE_URL = "remote_url"/);
assert.match(store, /private final AndroidKeystoreStringCipher stringCipher = new AndroidKeystoreStringCipher\(\)/);
assert.match(store, /KEY_ENCRYPTED_BASIC_AUTH_USER = "basic_auth_user_encrypted"/);
assert.ok(store.includes(`${encryptedPasswordKey} = "${encryptedPasswordValue}"`));
assert.match(store, /KEY_LEGACY_BASIC_AUTH_USER = "basic_auth_user"/);
assert.ok(store.includes(`${legacyPasswordKey} = "${legacyPasswordValue}"`));
assert.match(store, /String remoteUrl\(\)/);
assert.match(store, /void saveRemoteUrl\(String remoteUrl\)/);
assert.match(store, /BasicAuthCredentials basicAuth\(\)/);
assert.match(store, /boolean hasBasicAuth\(\)/);
assert.match(store, /void saveBasicAuth\(String user, String password\)/);
assert.match(store, /void clearBasicAuth\(\)/);
assert.match(store, /boolean hasAttemptedSavedAuth\(String host, String realm\)/);
assert.match(store, /void markSavedAuthAttempted\(String host, String realm\)/);
assert.match(store, /private BasicAuthCredentials migrateLegacyBasicAuth\(\)/);
assert.match(store, /stringCipher\.encrypt\(user\)/);
assert.match(store, /stringCipher\.encrypt\(password\)/);
assert.match(store, /stringCipher\.decrypt\(new AndroidKeystoreStringCipher\.EncryptedValue\(ciphertext, iv\)\)/);
assert.match(store, /putString\(KEY_ENCRYPTED_BASIC_AUTH_PASSWORD, encryptedPassword\.ciphertext\)/);
assert.match(store, /remove\(KEY_LEGACY_BASIC_AUTH_PASSWORD\)/);
assert.doesNotMatch(store, /putString\(KEY_LEGACY_BASIC_AUTH_PASSWORD,\s*password\)/);
assert.doesNotMatch(store, /putString\(KEY_LEGACY_BASIC_AUTH_USER,\s*user\)/);
assert.doesNotMatch(store, /Cipher\.getInstance/);
assert.doesNotMatch(store, /KeyStore\.getInstance/);
assert.doesNotMatch(store, /KeyGenerator\.getInstance/);
assert.doesNotMatch(store, /KeyGenParameterSpec/);
assert.doesNotMatch(store, /KeyProperties/);

assert.match(cipher, /final class AndroidKeystoreStringCipher/);
assert.match(cipher, /KEYSTORE_ALIAS = "job_sprint_basic_auth_v1"/);
assert.match(cipher, /CIPHER_TRANSFORMATION = "AES\/GCM\/NoPadding"/);
assert.match(cipher, /int GCM_TAG_BITS = 128/);
assert.match(cipher, /EncryptedValue encrypt\(String value\)/);
assert.match(cipher, /String decrypt\(EncryptedValue encryptedValue\)/);
assert.match(cipher, /private SecretKey secretKey\(\) throws Exception/);
assert.match(cipher, /Cipher\.getInstance\(CIPHER_TRANSFORMATION\)/);
assert.match(cipher, /KeyStore\.getInstance\("AndroidKeyStore"\)/);
assert.match(cipher, /KeyProperties\.PURPOSE_ENCRYPT \| KeyProperties\.PURPOSE_DECRYPT/);
assert.match(cipher, /setBlockModes\(KeyProperties\.BLOCK_MODE_GCM\)/);
assert.match(cipher, /setEncryptionPaddings\(KeyProperties\.ENCRYPTION_PADDING_NONE\)/);
assert.match(cipher, /setRandomizedEncryptionRequired\(true\)/);
assert.doesNotMatch(cipher, /SharedPreferences/);
assert.doesNotMatch(cipher, /KEY_REMOTE_URL/);
assert.doesNotMatch(cipher, /basic_auth_user/);

assert.match(startup, /AuthCredentialStore credentialStore = new AuthCredentialStore\(activity\)/);
assert.match(controller, /credentialStore\.remoteUrl\(\)/);
assert.match(controller, /credentialStore\.saveRemoteUrl\(normalized\)/);
assert.match(basicAuthController, /credentialStore\.basicAuth\(\)/);
assert.match(basicAuthController, /credentialStore\.saveBasicAuth\(userValue, passwordValue\)/);
assert.match(basicAuthController, /credentialStore\.clearBasicAuth\(\)/);
assert.match(basicAuthController, /credentialStore\.hasAttemptedSavedAuth\(host, realm\)/);
assert.match(basicAuthController, /credentialStore\.markSavedAuthAttempted\(host, realm\)/);
assert.match(startup, /new AndroidBasicAuthController\(\s*activity,?\s*[\s\S]*credentialStore,?\s*[\s\S]*remoteWebViewController/);
assert.doesNotMatch(activity, /AuthCredentialStore/);
assert.doesNotMatch(activity, /credentialStore/);
assert.doesNotMatch(activity, /credentialStore\.basicAuth\(\)/);
assert.doesNotMatch(activity, /credentialStore\.saveBasicAuth/);
assert.doesNotMatch(activity, /credentialStore\.clearBasicAuth/);
assert.doesNotMatch(activity, /import android\.content\.SharedPreferences/);
assert.doesNotMatch(activity, /PREFS_NAME = "job_sprint_android"/);
assert.doesNotMatch(activity, /KEY_REMOTE_URL = "remote_url"/);
assert.doesNotMatch(activity, /KEY_LEGACY_BASIC_AUTH_USER = "basic_auth_user"/);
assert.doesNotMatch(activity, /KEY_LEGACY_BASIC_AUTH_PASSWORD/);
assert.doesNotMatch(activity, /KEY_ENCRYPTED_BASIC_AUTH_PASSWORD/);
assert.doesNotMatch(activity, /AndroidKeystoreStringCipher/);

console.log("android auth credential store tests passed");
