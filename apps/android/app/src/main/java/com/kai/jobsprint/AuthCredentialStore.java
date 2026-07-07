package com.kai.jobsprint;

import android.content.Context;
import android.content.SharedPreferences;

import java.util.HashSet;
import java.util.Set;

final class AuthCredentialStore {
    private static final String PREFS_NAME = "job_sprint_android";
    private static final String KEY_REMOTE_URL = "remote_url";
    private static final String KEY_ENCRYPTED_BASIC_AUTH_USER = "basic_auth_user_encrypted";
    private static final String KEY_ENCRYPTED_BASIC_AUTH_USER_IV = "basic_auth_user_iv";
    private static final String KEY_ENCRYPTED_BASIC_AUTH_PASSWORD = "basic_auth_password_encrypted";
    private static final String KEY_ENCRYPTED_BASIC_AUTH_PASSWORD_IV = "basic_auth_password_iv";
    private static final String KEY_LEGACY_BASIC_AUTH_USER = "basic_auth_user";
    private static final String KEY_LEGACY_BASIC_AUTH_PASSWORD = "basic_auth_password";

    private final SharedPreferences prefs;
    private final AndroidKeystoreStringCipher stringCipher = new AndroidKeystoreStringCipher();
    private final Set<String> attemptedSavedAuthKeys = new HashSet<>();

    AuthCredentialStore(Context context) {
        prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    String remoteUrl() {
        return prefs.getString(KEY_REMOTE_URL, "");
    }

    void saveRemoteUrl(String remoteUrl) {
        prefs.edit().putString(KEY_REMOTE_URL, remoteUrl).apply();
    }

    BasicAuthCredentials basicAuth() {
        String user = readEncrypted(KEY_ENCRYPTED_BASIC_AUTH_USER, KEY_ENCRYPTED_BASIC_AUTH_USER_IV);
        String password = readEncrypted(KEY_ENCRYPTED_BASIC_AUTH_PASSWORD, KEY_ENCRYPTED_BASIC_AUTH_PASSWORD_IV);
        if (isBlank(user) || isBlank(password)) {
            BasicAuthCredentials migrated = migrateLegacyBasicAuth();
            if (migrated != null) {
                return migrated;
            }
        }
        if (isBlank(user) || isBlank(password)) {
            return null;
        }
        return new BasicAuthCredentials(user, password);
    }

    boolean hasBasicAuth() {
        return basicAuth() != null;
    }

    void saveBasicAuth(String user, String password) {
        AndroidKeystoreStringCipher.EncryptedValue encryptedUser = stringCipher.encrypt(user);
        AndroidKeystoreStringCipher.EncryptedValue encryptedPassword = stringCipher.encrypt(password);
        if (encryptedUser == null || encryptedPassword == null) {
            clearBasicAuth();
            return;
        }
        prefs.edit()
            .putString(KEY_ENCRYPTED_BASIC_AUTH_USER, encryptedUser.ciphertext)
            .putString(KEY_ENCRYPTED_BASIC_AUTH_USER_IV, encryptedUser.iv)
            .putString(KEY_ENCRYPTED_BASIC_AUTH_PASSWORD, encryptedPassword.ciphertext)
            .putString(KEY_ENCRYPTED_BASIC_AUTH_PASSWORD_IV, encryptedPassword.iv)
            .remove(KEY_LEGACY_BASIC_AUTH_USER)
            .remove(KEY_LEGACY_BASIC_AUTH_PASSWORD)
            .apply();
    }

    void clearBasicAuth() {
        prefs.edit()
            .remove(KEY_ENCRYPTED_BASIC_AUTH_USER)
            .remove(KEY_ENCRYPTED_BASIC_AUTH_USER_IV)
            .remove(KEY_ENCRYPTED_BASIC_AUTH_PASSWORD)
            .remove(KEY_ENCRYPTED_BASIC_AUTH_PASSWORD_IV)
            .remove(KEY_LEGACY_BASIC_AUTH_USER)
            .remove(KEY_LEGACY_BASIC_AUTH_PASSWORD)
            .apply();
        attemptedSavedAuthKeys.clear();
    }

    boolean hasAttemptedSavedAuth(String host, String realm) {
        return attemptedSavedAuthKeys.contains(authKey(host, realm));
    }

    void markSavedAuthAttempted(String host, String realm) {
        attemptedSavedAuthKeys.add(authKey(host, realm));
    }

    private String authKey(String host, String realm) {
        return String.valueOf(host) + "|" + String.valueOf(realm);
    }

    private boolean isBlank(String value) {
        return value == null || value.isEmpty();
    }

    private BasicAuthCredentials migrateLegacyBasicAuth() {
        String legacyUser = prefs.getString(KEY_LEGACY_BASIC_AUTH_USER, "");
        String legacyPassword = prefs.getString(KEY_LEGACY_BASIC_AUTH_PASSWORD, "");
        if (isBlank(legacyUser) || isBlank(legacyPassword)) {
            return null;
        }
        saveBasicAuth(legacyUser, legacyPassword);
        return new BasicAuthCredentials(legacyUser, legacyPassword);
    }

    private String readEncrypted(String valueKey, String ivKey) {
        String ciphertext = prefs.getString(valueKey, "");
        String iv = prefs.getString(ivKey, "");
        if (isBlank(ciphertext) || isBlank(iv)) {
            return "";
        }
        String decrypted = stringCipher.decrypt(new AndroidKeystoreStringCipher.EncryptedValue(ciphertext, iv));
        if (decrypted == null) {
            clearBasicAuth();
            return "";
        }
        return decrypted;
    }

    static final class BasicAuthCredentials {
        final String user;
        final String password;

        BasicAuthCredentials(String user, String password) {
            this.user = user;
            this.password = password;
        }
    }
}
