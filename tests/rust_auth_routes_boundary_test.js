const assert = require("assert");
const fs = require("fs");

const lib = fs.readFileSync("apps/rust-api/src/lib.rs", "utf8");
const authRoutes = fs.readFileSync("apps/rust-api/src/auth_routes.rs", "utf8");

assert.match(lib, /mod auth_routes;/);
assert.match(lib, /route\("\/api\/auth\/session", get\(auth_routes::session\)\)/);
assert.match(lib, /route\("\/api\/auth\/login", post\(auth_routes::login\)\)/);
assert.match(lib, /route\("\/api\/auth\/logout", post\(auth_routes::logout\)\)/);

assert.match(authRoutes, /pub\(crate\) async fn session/);
assert.match(authRoutes, /pub\(crate\) async fn login/);
assert.match(authRoutes, /pub\(crate\) async fn logout/);
assert.match(authRoutes, /login_rate::state/);
assert.match(authRoutes, /login_rate::record_failure/);
assert.match(authRoutes, /login_rate::clear_failures/);
assert.match(authRoutes, /sign_session/);
assert.match(authRoutes, /session_cookie/);
assert.match(authRoutes, /is_secure_request/);
assert.match(authRoutes, /verify_session/);
assert.match(authRoutes, /parse_json_body/);

assert.doesNotMatch(lib, /async fn auth_session/);
assert.doesNotMatch(lib, /async fn auth_login/);
assert.doesNotMatch(lib, /async fn auth_logout/);
assert.doesNotMatch(lib, /too_many_login_attempts/);
assert.doesNotMatch(lib, /invalid_credentials/);
assert.doesNotMatch(lib, /session_cookie\(/);

assert.doesNotMatch(authRoutes, /Sqlite/);
assert.doesNotMatch(authRoutes, /read_runtime_state/);
assert.doesNotMatch(authRoutes, /write_runtime_item/);
assert.doesNotMatch(authRoutes, /Router/);

console.log("rust auth routes boundary tests passed");
