const assert = require("assert");
const fs = require("fs");

const lib = fs.readFileSync("apps/rust-api/src/lib.rs", "utf8");
const authRoutes = fs.readFileSync("apps/rust-api/src/auth_routes.rs", "utf8");
const authState = fs.readFileSync("apps/rust-api/src/auth_state.rs", "utf8");
const sessionToken = fs.readFileSync("apps/rust-api/src/session_token.rs", "utf8");

assert.match(lib, /mod session_token;/);
assert.match(authRoutes, /use crate::session_token::\{is_secure_request, session_cookie, sign_session\};/);
assert.match(authState, /use crate::session_token::\{session_cookie_value, session_payload\};/);
assert.match(sessionToken, /const SESSION_COOKIE: &str = "job_sprint_session"/);
assert.match(sessionToken, /pub\(crate\) fn sign_session/);
assert.match(sessionToken, /pub\(crate\) fn session_payload/);
assert.match(sessionToken, /pub\(crate\) fn session_cookie_value/);
assert.match(sessionToken, /pub\(crate\) fn session_cookie/);
assert.match(sessionToken, /pub\(crate\) fn is_secure_request/);
assert.match(sessionToken, /fn hmac_base64/);
assert.match(sessionToken, /fn parse_cookies/);
assert.match(sessionToken, /fn constant_time_eq/);
assert.match(sessionToken, /signed_session_round_trips_payload/);
assert.match(sessionToken, /cookie_helpers_encode_decode_and_mark_secure/);

assert.doesNotMatch(lib, /const SESSION_COOKIE/);
assert.doesNotMatch(lib, /type HmacSha256/);
assert.doesNotMatch(lib, /fn sign_session/);
assert.doesNotMatch(lib, /fn hmac_base64/);
assert.doesNotMatch(lib, /fn parse_cookies/);
assert.doesNotMatch(lib, /fn session_cookie/);
assert.doesNotMatch(lib, /fn is_secure_request/);
assert.doesNotMatch(sessionToken, /AuthState/);
assert.doesNotMatch(sessionToken, /AuthConfig/);
assert.doesNotMatch(sessionToken, /UserConfig/);

console.log("rust session token boundary tests passed");
