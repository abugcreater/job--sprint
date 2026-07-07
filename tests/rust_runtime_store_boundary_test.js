const assert = require("assert");
const fs = require("fs");

const lib = fs.readFileSync("apps/rust-api/src/lib.rs", "utf8");
const applicationRoutes = fs.readFileSync("apps/rust-api/src/application_routes.rs", "utf8");
const bootstrap = fs.readFileSync("apps/rust-api/src/app_bootstrap.rs", "utf8");
const runtimeRoutes = fs.readFileSync("apps/rust-api/src/runtime_routes.rs", "utf8");
const dataRoutes = fs.readFileSync("apps/rust-api/src/data_routes.rs", "utf8");
const interviewMistakeRoutes = fs.readFileSync("apps/rust-api/src/interview_mistake_routes.rs", "utf8");
const store = fs.readFileSync("apps/rust-api/src/runtime_store.rs", "utf8");

assert.match(lib, /mod application_routes;/);
assert.match(lib, /mod interview_mistake_routes;/);
assert.match(lib, /mod runtime_store;/);
assert.match(bootstrap, /use crate::runtime_store::migrate_legacy_runtime_json;/);
assert.match(bootstrap, /migrate_legacy_runtime_json\(&db, &auth_config\.data_owner\)\.await\?/);
assert.match(runtimeRoutes, /use crate::runtime_store::\{/);
assert.match(applicationRoutes, /use crate::runtime_store::\{/);
assert.match(interviewMistakeRoutes, /use crate::runtime_store::\{/);
assert.match(store, /pub\(crate\) struct RuntimeState/);
assert.match(store, /pub\(crate\) async fn migrate_legacy_runtime_json/);
assert.match(store, /pub\(crate\) async fn read_runtime_state/);
assert.match(store, /pub\(crate\) async fn write_runtime_item/);
assert.match(store, /pub\(crate\) async fn write_runtime_state/);
assert.match(store, /pub\(crate\) fn normalize_runtime_payload/);
assert.match(store, /pub\(crate\) fn runtime_to_json/);
assert.match(store, /SELECT item_key, value FROM runtime_items/);
assert.match(store, /INSERT INTO runtime_items/);

assert.doesNotMatch(lib, /async fn read_runtime_state/);
assert.doesNotMatch(lib, /async fn write_runtime_item/);
assert.doesNotMatch(lib, /async fn write_runtime_state/);
assert.doesNotMatch(lib, /fn normalize_runtime_payload/);
assert.doesNotMatch(lib, /fn runtime_to_json/);
assert.doesNotMatch(lib, /migrate_legacy_runtime_json/);
assert.match(runtimeRoutes, /read_runtime_state/);
assert.match(runtimeRoutes, /write_runtime_state/);
assert.match(runtimeRoutes, /normalize_runtime_payload/);
assert.match(runtimeRoutes, /runtime_to_json/);
assert.match(applicationRoutes, /read_runtime_state/);
assert.match(applicationRoutes, /write_runtime_item/);
assert.match(interviewMistakeRoutes, /read_runtime_state/);
assert.match(interviewMistakeRoutes, /write_runtime_item/);
assert.doesNotMatch(dataRoutes, /read_runtime_state/);
assert.doesNotMatch(dataRoutes, /write_runtime_item/);
assert.doesNotMatch(dataRoutes, /runtime_store/);

console.log("rust runtime store boundary tests passed");
