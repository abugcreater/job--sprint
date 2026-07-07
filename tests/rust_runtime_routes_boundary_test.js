const assert = require("assert");
const fs = require("fs");

const lib = fs.readFileSync("apps/rust-api/src/lib.rs", "utf8");
const runtimeRoutes = fs.readFileSync("apps/rust-api/src/runtime_routes.rs", "utf8");

assert.match(lib, /mod runtime_routes;/);
assert.match(
  lib,
  /route\(\s*"\/api\/runtime",\s*get\(runtime_routes::get_runtime\)\.post\(runtime_routes::post_runtime\),\s*\)/,
);
assert.match(
  lib,
  /route\(\s*"\/api\/progress",\s*get\(runtime_routes::get_progress\)\.post\(runtime_routes::post_progress\),\s*\)/,
);
assert.match(
  lib,
  /route\(\s*"\/api\/reviews",\s*get\(runtime_routes::get_reviews\)\.post\(runtime_routes::post_reviews\),\s*\)/,
);

[
  "get_runtime",
  "post_runtime",
  "get_progress",
  "post_progress",
  "get_reviews",
  "post_reviews",
].forEach((handler) => {
  assert.match(runtimeRoutes, new RegExp(`pub\\(crate\\) async fn ${handler}`));
  assert.doesNotMatch(lib, new RegExp(`async fn ${handler}`));
});

assert.match(runtimeRoutes, /require_auth/);
assert.match(runtimeRoutes, /require_write_permission/);
assert.match(runtimeRoutes, /runtime_response/);
assert.match(runtimeRoutes, /user_data_scope/);
assert.match(runtimeRoutes, /normalize_runtime_payload/);
assert.match(runtimeRoutes, /runtime_to_json/);
assert.match(runtimeRoutes, /normalize_object/);
assert.match(runtimeRoutes, /write_runtime_state/);
assert.match(runtimeRoutes, /write_runtime_item/);
assert.match(runtimeRoutes, /read_runtime_state/);
assert.match(runtimeRoutes, /parse_json_body/);

assert.doesNotMatch(runtimeRoutes, /login_rate/);
assert.doesNotMatch(runtimeRoutes, /session_cookie/);
assert.doesNotMatch(runtimeRoutes, /static_path_for/);
assert.doesNotMatch(runtimeRoutes, /Router/);

console.log("rust runtime routes boundary tests passed");
