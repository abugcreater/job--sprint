const assert = require("assert");
const fs = require("fs");

const lib = fs.readFileSync("apps/rust-api/src/lib.rs", "utf8");
const staticRoutes = fs.readFileSync("apps/rust-api/src/static_routes.rs", "utf8");
const staticFiles = fs.readFileSync("apps/rust-api/src/static_files.rs", "utf8");

assert.match(lib, /mod static_routes;/);
assert.match(lib, /\.fallback\(static_routes::static_or_api_not_found\)/);
assert.match(staticRoutes, /pub\(crate\) async fn static_or_api_not_found/);
assert.match(staticRoutes, /State\(state\): State<AppState>/);
assert.match(staticRoutes, /starts_with\("\/api\/"\)/);
assert.match(staticRoutes, /starts_with\("\/job-sprint\/api\/"\)/);
assert.match(staticRoutes, /StatusCode::NOT_FOUND/);
assert.match(staticRoutes, /StatusCode::METHOD_NOT_ALLOWED/);
assert.match(staticRoutes, /normalize_pathname/);
assert.match(staticRoutes, /request_base/);
assert.match(staticRoutes, /is_private_static/);
assert.match(staticRoutes, /verify_session/);
assert.match(staticRoutes, /reject_static_unauthenticated/);
assert.match(staticRoutes, /auth_has_permission/);
assert.match(staticRoutes, /static_path_for/);
assert.match(staticRoutes, /tokio::fs::read/);
assert.match(staticRoutes, /bytes_response/);
assert.match(staticRoutes, /text_response/);
assert.match(staticRoutes, /redirect_response/);
assert.match(staticRoutes, /json_response/);
assert.match(staticRoutes, /no_store_path/);
assert.match(staticRoutes, /content_type_for/);

assert.doesNotMatch(lib, /async fn static_or_api_not_found/);
assert.doesNotMatch(lib, /verify_session/);
assert.doesNotMatch(lib, /reject_static_unauthenticated/);
assert.doesNotMatch(lib, /auth_has_permission/);
assert.doesNotMatch(lib, /tokio::fs::read/);
assert.doesNotMatch(staticFiles, /json_response/);
assert.doesNotMatch(staticFiles, /bytes_response/);
assert.doesNotMatch(staticFiles, /verify_session/);

console.log("rust static routes boundary tests passed");
