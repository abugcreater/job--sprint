const assert = require("assert");
const fs = require("fs");

const lib = fs.readFileSync("apps/rust-api/src/lib.rs", "utf8");
const bootstrap = fs.readFileSync("apps/rust-api/src/app_bootstrap.rs", "utf8");
const loginRate = fs.readFileSync("apps/rust-api/src/login_rate.rs", "utf8");

assert.match(lib, /mod login_rate;/);
assert.match(bootstrap, /use crate::login_rate::\{LoginFailureStore, new_login_failure_store\};/);
assert.match(bootstrap, /pub\(crate\) login_failures: LoginFailureStore/);
assert.match(bootstrap, /login_failures: new_login_failure_store\(\)/);
assert.match(loginRate, /pub\(crate\) type LoginFailureStore/);
assert.match(loginRate, /pub\(crate\) struct LoginFailure/);
assert.match(loginRate, /pub\(crate\) struct RateState/);
assert.match(loginRate, /pub\(crate\) fn new_login_failure_store/);
assert.match(loginRate, /pub\(crate\) fn state/);
assert.match(loginRate, /pub\(crate\) fn record_failure/);
assert.match(loginRate, /pub\(crate\) fn clear_failures/);
assert.match(loginRate, /use crate::auth_hash::sha256_hex;/);
assert.match(loginRate, /fn login_rate_key/);
assert.match(loginRate, /fn client_ip/);
assert.match(loginRate, /JOB_SPRINT_LOGIN_RATE_LIMIT_WINDOW_MS/);
assert.match(loginRate, /JOB_SPRINT_LOGIN_RATE_LIMIT_MAX/);
assert.match(loginRate, /key_uses_forwarded_ip_and_normalized_username/);

assert.doesNotMatch(lib, /struct LoginFailure/);
assert.doesNotMatch(lib, /struct RateState/);
assert.doesNotMatch(lib, /fn login_rate_state/);
assert.doesNotMatch(lib, /fn record_failed_login/);
assert.doesNotMatch(lib, /fn clear_login_failures/);
assert.doesNotMatch(lib, /fn login_rate_key/);
assert.doesNotMatch(lib, /fn client_ip/);
assert.doesNotMatch(lib, /new_login_failure_store/);
assert.doesNotMatch(loginRate, /AppState/);
assert.doesNotMatch(loginRate, /use sha2::/);
assert.doesNotMatch(loginRate, /fn sha256_hex/);

console.log("rust login rate boundary tests passed");
