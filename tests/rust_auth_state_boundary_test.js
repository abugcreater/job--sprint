const assert = require("assert");
const fs = require("fs");

const lib = fs.readFileSync("apps/rust-api/src/lib.rs", "utf8");
const staticRoutes = fs.readFileSync("apps/rust-api/src/static_routes.rs", "utf8");
const authBearer = fs.readFileSync("apps/rust-api/src/auth_bearer.rs", "utf8");
const authHttp = fs.readFileSync("apps/rust-api/src/auth_http.rs", "utf8");
const authHash = fs.readFileSync("apps/rust-api/src/auth_hash.rs", "utf8");
const authPermissions = fs.readFileSync("apps/rust-api/src/auth_permissions.rs", "utf8");
const authState = fs.readFileSync("apps/rust-api/src/auth_state.rs", "utf8");

assert.match(lib, /mod auth_bearer;/);
assert.match(lib, /mod auth_http;/);
assert.match(lib, /mod auth_permissions;/);
assert.match(lib, /mod auth_state;/);
assert.match(
  staticRoutes,
  /use crate::auth_state::\{auth_has_permission, reject_static_unauthenticated, verify_session\};/
);
assert.match(authState, /pub\(crate\) struct AuthState/);
assert.match(authState, /pub\(crate\) struct PublicUser/);
assert.match(
  authState,
  /pub\(crate\) use crate::auth_http::\{[\s\S]*reject_static_unauthenticated[\s\S]*runtime_response[\s\S]*runtime_response_status[\s\S]*\};/,
);
assert.match(authState, /use crate::auth_http::reject_unauthenticated;/);
assert.match(authState, /use crate::auth_bearer::verify_bearer_token;/);
assert.match(
  authState,
  /use crate::auth_permissions::\{has_permission, permissions_are_read_only, permissions_for\};/
);
assert.match(authState, /pub\(crate\) fn verify_session/);
assert.match(authBearer, /pub\(crate\) fn verify_bearer_token/);
assert.match(authBearer, /fn token_not_expired/);
assert.match(authBearer, /header::AUTHORIZATION/);
assert.match(authBearer, /sha256_hex/);
assert.match(authState, /pub\(crate\) fn require_auth/);
assert.match(authState, /pub\(crate\) fn require_permission/);
assert.match(authState, /pub\(crate\) fn require_write_permission/);
assert.match(authState, /pub\(crate\) fn auth_has_permission/);
assert.match(authState, /pub\(crate\) fn user_data_scope/);
assert.match(authHttp, /pub\(crate\) fn reject_unauthenticated/);
assert.match(authHttp, /pub\(crate\) fn runtime_response/);
assert.match(authHttp, /pub\(crate\) fn runtime_response_status/);
assert.match(authHttp, /pub\(crate\) fn reject_static_unauthenticated/);
assert.match(authHttp, /use crate::auth_state::AuthState;/);
assert.match(authHttp, /request_base/);
assert.match(authHttp, /redirect_response/);
assert.match(authHttp, /readOnly/);
assert.match(authHttp, /job-sprint 应用层认证未配置/);
assert.match(authHash, /pub\(crate\) fn constant_time_eq/);
assert.match(authState, /pub\(crate\) fn now_millis/);
assert.match(authPermissions, /pub\(crate\) fn permissions_for/);
assert.match(authPermissions, /pub\(crate\) fn permissions_are_read_only/);
assert.match(authPermissions, /pub\(crate\) fn has_permission/);
assert.match(authPermissions, /fn role_permissions/);

assert.doesNotMatch(lib, /fn verify_bearer_token/);
assert.doesNotMatch(lib, /fn normalize_permissions/);
assert.doesNotMatch(lib, /fn role_permissions/);
assert.doesNotMatch(lib, /fn reject_unauthenticated/);
assert.doesNotMatch(lib, /fn token_not_expired/);
assert.doesNotMatch(lib, /struct AuthState/);
assert.doesNotMatch(lib, /struct PublicUser/);
assert.doesNotMatch(lib, /verify_session/);
assert.doesNotMatch(lib, /reject_static_unauthenticated/);
assert.doesNotMatch(lib, /auth_has_permission/);

assert.doesNotMatch(authState, /fn runtime_response_status/);
assert.doesNotMatch(authState, /fn reject_static_unauthenticated/);
assert.doesNotMatch(authState, /redirect_response/);
assert.doesNotMatch(authState, /request_base/);
assert.doesNotMatch(authState, /Map::new/);
assert.doesNotMatch(authState, /readOnly/);
assert.doesNotMatch(authState, /Sqlite/);
assert.doesNotMatch(authState, /AppState/);
assert.doesNotMatch(authState, /Router/);
assert.doesNotMatch(authState, /header::AUTHORIZATION/);
assert.doesNotMatch(authState, /sha256_hex/);
assert.doesNotMatch(authState, /DateTime/);
assert.doesNotMatch(authState, /read_runtime_state/);
assert.doesNotMatch(authState, /write_runtime_item/);
assert.doesNotMatch(authState, /HashSet/);
assert.doesNotMatch(authState, /fn normalize_permissions/);
assert.doesNotMatch(authState, /fn role_permissions/);
assert.doesNotMatch(authState, /fn token_not_expired/);
assert.doesNotMatch(authState, /fn verify_bearer_token/);
assert.doesNotMatch(authBearer, /Response/);
assert.doesNotMatch(authBearer, /json_response/);
assert.doesNotMatch(authBearer, /runtime_response/);
assert.doesNotMatch(authBearer, /permissions_for/);
assert.doesNotMatch(authHttp, /verify_session/);
assert.doesNotMatch(authHttp, /verify_bearer_token/);
assert.doesNotMatch(authHttp, /session_payload/);
assert.doesNotMatch(authHttp, /permissions_for/);
assert.doesNotMatch(authPermissions, /HeaderMap/);
assert.doesNotMatch(authPermissions, /Response/);

console.log("rust auth state boundary tests passed");
