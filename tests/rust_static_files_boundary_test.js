const assert = require("assert");
const fs = require("fs");

const lib = fs.readFileSync("apps/rust-api/src/lib.rs", "utf8");
const staticRoutes = fs.readFileSync("apps/rust-api/src/static_routes.rs", "utf8");
const staticFiles = fs.readFileSync("apps/rust-api/src/static_files.rs", "utf8");

assert.match(lib, /mod static_files;/);
assert.match(lib, /mod static_routes;/);
assert.match(staticRoutes, /use crate::static_files::\{/);
assert.match(staticFiles, /pub\(crate\) fn normalize_pathname/);
assert.match(staticFiles, /pub\(crate\) fn request_base/);
assert.match(staticFiles, /pub\(crate\) fn is_private_static/);
assert.match(staticFiles, /pub\(crate\) fn static_path_for/);
assert.match(staticFiles, /pub\(crate\) fn content_type_for/);
assert.match(staticFiles, /pub\(crate\) fn no_store_path/);
assert.match(staticFiles, /fn safe_static_path/);
assert.match(staticFiles, /fn public_safe_static_path/);
assert.match(staticFiles, /fn safe_join/);
assert.match(staticFiles, /apps\/react-web\/dist/);
assert.match(staticFiles, /dist\/public-safe/);
assert.match(staticFiles, /assets\/embedded-data\.js/);
assert.match(staticFiles, /Component::ParentDir/);
assert.match(staticFiles, /Component::RootDir/);
assert.match(staticFiles, /Component::Prefix/);

assert.doesNotMatch(lib, /fn normalize_pathname/);
assert.doesNotMatch(lib, /fn safe_static_path/);
assert.doesNotMatch(lib, /fn static_path_for/);
assert.doesNotMatch(lib, /fn public_safe_static_path/);
assert.doesNotMatch(lib, /fn safe_join/);
assert.doesNotMatch(lib, /static_path_for/);
assert.doesNotMatch(staticFiles, /AuthState/);
assert.doesNotMatch(staticFiles, /auth_has_permission/);
assert.doesNotMatch(staticFiles, /verify_session/);
assert.doesNotMatch(staticFiles, /tokio::fs::read/);

console.log("rust static files boundary tests passed");
