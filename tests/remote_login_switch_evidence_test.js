const assert = require("assert");
const fs = require("fs");

const tool = fs.readFileSync("tools/write_remote_login_switch_evidence.js", "utf8");
const packageJson = fs.readFileSync("package.json", "utf8");
const deliveryCommands = fs.readFileSync("tools/delivery_action_commands.js", "utf8");

assert.match(tool, /reactRequire\("playwright"\)/, "login switch evidence must use Playwright");
assert.match(tool, /#loginUser/, "login switch evidence must fill the real login username field");
assert.match(tool, /#loginPassword/, "login switch evidence must fill the real login password field");
assert.match(tool, /getByRole\("button", \{ name: "退出" \}\)/, "login switch evidence must use the visible logout button");
assert.match(tool, /smoke_ui_login_after_switch/, "login switch evidence must prove the second UI login");
assert.match(tool, /smoke_account_cleanup/, "login switch evidence must clean up the temporary account");
assert.match(tool, /containsCredential\(provision\.text, password\)/, "login switch evidence must check credential leakage");
assert.doesNotMatch(tool, /console\.log\(password\)/, "login switch evidence must not print generated passwords");
assert.match(packageJson, /write:remote-login-switch-evidence/, "package script should expose login switch evidence");
assert.match(packageJson, /node --check tools\/write_remote_login_switch_evidence\.js/, "root test should syntax-check login switch evidence tool");
assert.match(deliveryCommands, /remoteLoginSwitch/, "delivery command table should include login switch evidence");

console.log("远端 UI 登录切换 evidence 结构测试通过。");
