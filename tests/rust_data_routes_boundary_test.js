const assert = require("assert");
const fs = require("fs");

const lib = fs.readFileSync("apps/rust-api/src/lib.rs", "utf8");
const applicationRoutes = fs.readFileSync("apps/rust-api/src/application_routes.rs", "utf8");
const dataRoutes = fs.readFileSync("apps/rust-api/src/data_routes.rs", "utf8");
const interviewMistakeRoutes = fs.readFileSync("apps/rust-api/src/interview_mistake_routes.rs", "utf8");
const runtimeRecords = fs.readFileSync("apps/rust-api/src/runtime_records.rs", "utf8");

assert.match(lib, /mod application_routes;/);
assert.match(lib, /mod data_routes;/);
assert.match(lib, /mod interview_mistake_routes;/);
assert.match(lib, /mod runtime_records;/);
assert.match(
  lib,
  /route\(\s*"\/api\/applications",\s*get\(data_routes::get_applications\)\.post\(data_routes::post_applications\),\s*\)/,
);
assert.match(
  lib,
  /route\(\s*"\/api\/applications\/\{id\}",\s*put\(data_routes::update_application\)\.delete\(data_routes::delete_application\),\s*\)/,
);
assert.match(
  lib,
  /route\(\s*"\/api\/interview-mistakes",\s*get\(data_routes::get_interview_mistakes\)\.post\(data_routes::post_interview_mistakes\),\s*\)/,
);
assert.match(
  lib,
  /route\(\s*"\/api\/interview-mistakes\/\{id\}",\s*delete\(data_routes::delete_interview_mistake\),\s*\)/,
);

[
  "get_applications",
  "post_applications",
  "update_application",
  "delete_application",
].forEach((handler) => {
  assert.match(applicationRoutes, new RegExp(`pub\\(crate\\) async fn ${handler}`));
  assert.match(dataRoutes, new RegExp(handler));
  assert.doesNotMatch(lib, new RegExp(`async fn ${handler}`));
});

[
  "get_interview_mistakes",
  "post_interview_mistakes",
  "delete_interview_mistake",
].forEach((handler) => {
  assert.match(interviewMistakeRoutes, new RegExp(`pub\\(crate\\) async fn ${handler}`));
  assert.match(dataRoutes, new RegExp(handler));
  assert.doesNotMatch(lib, new RegExp(`async fn ${handler}`));
});

assert.match(
  dataRoutes,
  /pub\(crate\) use crate::application_routes::\{[\s\S]*delete_application[\s\S]*get_applications[\s\S]*post_applications[\s\S]*update_application[\s\S]*\};/,
);
assert.match(
  dataRoutes,
  /pub\(crate\) use crate::interview_mistake_routes::\{[\s\S]*delete_interview_mistake[\s\S]*get_interview_mistakes[\s\S]*post_interview_mistakes[\s\S]*\};/,
);
assert.match(applicationRoutes, /require_auth/);
assert.match(applicationRoutes, /require_write_permission/);
assert.match(applicationRoutes, /runtime_response/);
assert.match(applicationRoutes, /runtime_response_status/);
assert.match(applicationRoutes, /user_data_scope/);
assert.match(applicationRoutes, /read_runtime_state/);
assert.match(applicationRoutes, /write_runtime_item/);
assert.match(applicationRoutes, /use crate::runtime_records::\{normalize_record, object_value\};/);
assert.match(interviewMistakeRoutes, /require_auth/);
assert.match(interviewMistakeRoutes, /require_write_permission/);
assert.match(interviewMistakeRoutes, /runtime_response/);
assert.match(interviewMistakeRoutes, /runtime_response_status/);
assert.match(interviewMistakeRoutes, /user_data_scope/);
assert.match(interviewMistakeRoutes, /read_runtime_state/);
assert.match(interviewMistakeRoutes, /write_runtime_item/);
assert.match(interviewMistakeRoutes, /use crate::runtime_records::normalize_record;/);
assert.match(runtimeRecords, /pub\(crate\) fn normalize_record/);
assert.match(runtimeRecords, /pub\(crate\) fn object_value/);
assert.match(runtimeRecords, /fn make_id/);
assert.match(applicationRoutes, /normalize_record/);
assert.match(applicationRoutes, /object_value/);
assert.match(applicationRoutes, /applications/);
assert.match(interviewMistakeRoutes, /normalize_record/);
assert.match(interviewMistakeRoutes, /interview_mistakes/);

assert.doesNotMatch(lib, /fn normalize_record/);
assert.doesNotMatch(lib, /fn object_value/);
assert.doesNotMatch(lib, /fn make_id/);
assert.doesNotMatch(dataRoutes, /async fn/);
assert.doesNotMatch(dataRoutes, /require_auth/);
assert.doesNotMatch(dataRoutes, /require_write_permission/);
assert.doesNotMatch(dataRoutes, /runtime_response/);
assert.doesNotMatch(dataRoutes, /read_runtime_state/);
assert.doesNotMatch(dataRoutes, /write_runtime_item/);
assert.doesNotMatch(dataRoutes, /normalize_record/);
assert.doesNotMatch(dataRoutes, /object_value/);
assert.doesNotMatch(applicationRoutes, /interview_mistakes/);
assert.doesNotMatch(interviewMistakeRoutes, /object_value/);
assert.doesNotMatch(interviewMistakeRoutes, /applications/);
assert.doesNotMatch(dataRoutes, /fn normalize_record/);
assert.doesNotMatch(dataRoutes, /fn object_value/);
assert.doesNotMatch(dataRoutes, /fn make_id/);
assert.doesNotMatch(applicationRoutes, /fn normalize_record/);
assert.doesNotMatch(interviewMistakeRoutes, /fn normalize_record/);
assert.doesNotMatch(applicationRoutes, /Uuid/);
assert.doesNotMatch(applicationRoutes, /Utc/);
assert.doesNotMatch(interviewMistakeRoutes, /Uuid/);
assert.doesNotMatch(interviewMistakeRoutes, /Utc/);
assert.doesNotMatch(dataRoutes, /score_answer_payload/);
assert.doesNotMatch(dataRoutes, /generate_kb_payload/);
assert.doesNotMatch(dataRoutes, /transcribe_upload_response/);
assert.doesNotMatch(dataRoutes, /session_cookie/);
assert.doesNotMatch(dataRoutes, /static_path_for/);
assert.doesNotMatch(dataRoutes, /Router/);
assert.doesNotMatch(runtimeRecords, /HeaderMap/);
assert.doesNotMatch(runtimeRecords, /write_runtime_item/);

console.log("rust data routes boundary tests passed");
