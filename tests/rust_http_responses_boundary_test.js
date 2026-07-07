const assert = require("assert");
const fs = require("fs");

const lib = fs.readFileSync("apps/rust-api/src/lib.rs", "utf8");
const healthRoutes = fs.readFileSync("apps/rust-api/src/health_routes.rs", "utf8");
const staticRoutes = fs.readFileSync("apps/rust-api/src/static_routes.rs", "utf8");
const responses = fs.readFileSync("apps/rust-api/src/http_responses.rs", "utf8");

assert.match(lib, /mod http_responses;/);
assert.match(lib, /mod health_routes;/);
assert.match(healthRoutes, /use crate::http_responses::json_response;/);
assert.match(healthRoutes, /pub\(crate\) async fn health/);
assert.match(staticRoutes, /use crate::http_responses::\{bytes_response, json_response, redirect_response, text_response\};/);
assert.match(responses, /pub\(crate\) fn json_response/);
assert.match(responses, /pub\(crate\) fn text_response/);
assert.match(responses, /pub\(crate\) fn bytes_response/);
assert.match(responses, /pub\(crate\) fn redirect_response/);
assert.match(responses, /pub\(crate\) fn bad_json/);
assert.match(responses, /pub\(crate\) fn internal_error/);
assert.match(responses, /pub\(crate\) fn insert_header/);
assert.match(responses, /fn apply_common_headers/);
assert.match(responses, /x-content-type-options/);
assert.match(responses, /x-frame-options/);
assert.match(responses, /permissions-policy/);
assert.match(responses, /public, max-age=60/);

assert.doesNotMatch(lib, /fn json_response/);
assert.doesNotMatch(lib, /fn text_response/);
assert.doesNotMatch(lib, /fn bytes_response/);
assert.doesNotMatch(lib, /fn redirect_response/);
assert.doesNotMatch(lib, /fn bad_json/);
assert.doesNotMatch(lib, /fn internal_error/);
assert.doesNotMatch(lib, /fn apply_common_headers/);
assert.doesNotMatch(lib, /use http_responses::json_response;/);
assert.doesNotMatch(staticRoutes, /fn json_response/);
assert.doesNotMatch(staticRoutes, /fn text_response/);
assert.doesNotMatch(staticRoutes, /fn bytes_response/);
assert.doesNotMatch(staticRoutes, /fn redirect_response/);

console.log("rust http responses boundary tests passed");
