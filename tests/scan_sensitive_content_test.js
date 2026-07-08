const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { scanLine, scanRoot } = require("../tools/scan_sensitive_content");

const tokenKey = "ANTHROPIC_" + "AUTH_TOKEN";

assert.deepStrictEqual(scanLine(`"${tokenKey}=",`), []);
assert.deepStrictEqual(scanLine(`${tokenKey}=`), []);
assert.ok(scanLine(`${tokenKey}=real-secret-value`).includes("anthropic-token"));
assert.ok(scanLine(`${tokenKey}="real-secret-value"`).includes("anthropic-token"));
assert.ok(scanLine(`${["/Users", "kai"].join("/")} should not be committed`).includes("private-local-path"));
assert.ok(scanLine(`https://${["app", "jobdailyschedule", "site"].join(".")}/job-sprint`).includes("real-deploy-domain"));
assert.ok(scanLine(["app", "jobdailyschedule", "site"].join("\\.")).includes("real-deploy-domain"));
assert.ok(scanLine(["118", "25", "151", "251"].join(".")).includes("real-server-ip"));
assert.ok(scanLine(["118", "25", "151", "251"].join("\\.")).includes("real-server-ip"));
assert.ok(scanLine(["冯", "凯"].join("")).includes("personal-name"));
assert.ok(scanLine(["feng", "kai"].join("-")).includes("personal-name-pinyin"));
assert.deepStrictEqual(scanLine("https://job-sprint.example.com/job-sprint"), []);
assert.deepStrictEqual(scanLine("http://203.0.113.10/job-sprint"), []);
assert.deepStrictEqual(scanLine("/path/to/job-sprint-coach"), []);

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "job-sprint-sensitive-scan-"));
try {
  const sshKeyName = ["id", "rsa"].join("_");
  fs.mkdirSync(path.join(tmpDir, "apps", "rust-api", "target", "debug"), { recursive: true });
  fs.mkdirSync(path.join(tmpDir, "docs", "evidence"), { recursive: true });
  fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, "apps", "rust-api", "target", "debug", "job-sprint-api"), `embedded /tmp/${sshKeyName} from compiler output`);
  fs.writeFileSync(path.join(tmpDir, "docs", "evidence", "remote.json"), `http://${["118", "25", "151", "251"].join(".")} ${["/Users", "kai"].join("/")}`);
  fs.writeFileSync(path.join(tmpDir, "src", "leak.txt"), `manual /tmp/${sshKeyName} source value`);
  const findings = scanRoot(tmpDir);

  assert.ok(findings.some((item) => item.file === path.join("src", "leak.txt") && item.rule === "ssh-private-path"));
  assert.ok(findings.every((item) => !item.file.includes(`${path.sep}target${path.sep}`)));
  assert.ok(findings.every((item) => !item.file.startsWith(path.join("docs", "evidence"))));
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

console.log("sensitive scanner tests passed");
