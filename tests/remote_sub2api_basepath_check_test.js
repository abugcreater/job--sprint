const assert = require("assert");
const http = require("http");
const path = require("path");
const { spawn } = require("child_process");

const root = path.resolve(__dirname, "..");

function startFixture() {
  const responses = {
    "/sub2api/": [
      "<!doctype html>",
      '<link rel="icon" href="/sub2api/logo.svg">',
      '<link rel="stylesheet" href="/sub2api/assets/index.css">',
      '<script type="module" src="/sub2api/assets/index.js"></script>'
    ].join("\n"),
    "/sub2api/logo.svg": '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
    "/sub2api/assets/index.css": "body { color: #111; }",
    "/sub2api/assets/index.js": [
      'const apiBase="/sub2api/api/v1";',
      'const router={history:q("/sub2api/")};',
      'const deferredChunk="sub2api/assets/deferred.js";',
      'const deferredStyle="sub2api/assets/deferred.css";'
    ].join("\n"),
    "/sub2api/assets/deferred.js": "export const ready = true;",
    "/sub2api/assets/deferred.css": ".ready { display: block; }",
    "/sub2api/api/v1/settings/public": "{}"
  };
  const server = http.createServer((request, response) => {
    const body = responses[new URL(request.url, "http://fixture.invalid").pathname];
    if (body === undefined) {
      response.writeHead(404);
      response.end("not found");
      return;
    }
    response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    response.end(body);
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${address.port}` });
    });
  });
}

function runCheck(baseUrl) {
  return new Promise((resolve, reject) => {
    const child = spawn("bash", ["tools/remote_sub2api_basepath_check.sh", baseUrl], {
      cwd: root,
      env: { ...process.env, JOB_SPRINT_CURL_NO_PROXY: "1" }
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

async function main() {
  const { server, baseUrl } = await startFixture();
  try {
    const result = await runCheck(baseUrl);
    assert.strictEqual(result.code, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /OK \/sub2api\/logo\.svg 200/);
    assert.match(result.stdout, /remote Sub2API base path check passed/);
    console.log("Sub2API SVG logo base-path regression test passed.");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
