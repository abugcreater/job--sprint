const assert = require("assert");
const fs = require("fs");

const app = fs.readFileSync("apps/server/app.js", "utf8");
const auth = fs.readFileSync("apps/server/auth.js", "utf8");
const authRoutes = fs.readFileSync("apps/server/auth_routes.js", "utf8");

assert.match(app, /require\("\.\/auth"\)/);
assert.match(app, /getAuthConfig/);
assert.match(app, /verifySession/);
assert.match(app, /sessionCookie/);
assert.match(app, /isSecureRequest/);
assert.match(app, /require\("\.\/auth_routes"\)/);
assert.match(app, /handleAuth/);

assert.match(auth, /const ROLE_PERMISSIONS =/);
assert.match(auth, /function getAuthConfig\(\)/);
assert.match(auth, /function verifySession\(req\)/);
assert.match(auth, /function signSession\(payload, secret\)/);
assert.match(auth, /function sessionCookie\(value, options = \{\}\)/);
assert.match(auth, /function hasPermission\(authState, permission\)/);
assert.match(auth, /module\.exports = \{/);

assert.doesNotMatch(app, /const ROLE_PERMISSIONS =/);
assert.doesNotMatch(app, /const SESSION_COOKIE =/);
assert.doesNotMatch(app, /const MIN_SESSION_SECRET_LENGTH =/);
assert.doesNotMatch(app, /function getAuthConfig\(\)/);
assert.doesNotMatch(app, /function verifySession\(req\)/);
assert.doesNotMatch(app, /function verifyBearerToken/);
assert.doesNotMatch(app, /function usersFromConfigObject/);
assert.doesNotMatch(app, /function bearerTokensFromEnv/);
assert.doesNotMatch(app, /function publicUser\(userConfig\)/);
assert.doesNotMatch(app, /function sessionCookie\(value/);
assert.doesNotMatch(app, /function isSecureRequest\(req\)/);
assert.doesNotMatch(app, /hasPermission/);
assert.doesNotMatch(app, /async function handleAuth\(/);
assert.doesNotMatch(app, /function loginRateState\(/);
assert.doesNotMatch(app, /function recordFailedLogin\(/);
assert.doesNotMatch(app, /function clearLoginFailures\(/);

assert.match(authRoutes, /async function handleAuth\(/);
assert.match(authRoutes, /function loginRateState\(/);
assert.match(authRoutes, /function recordFailedLogin\(/);
assert.match(authRoutes, /function clearLoginFailures\(/);
assert.match(authRoutes, /SESSION_TTL_MS/);
assert.match(authRoutes, /sessionCookie/);
assert.match(authRoutes, /isSecureRequest/);
assert.match(authRoutes, /module\.exports = \{/);

assert.doesNotMatch(auth, /http\.createServer/);
assert.doesNotMatch(auth, /function route/);
assert.doesNotMatch(auth, /function serveStatic/);
assert.doesNotMatch(auth, /function handleRuntime/);
assert.doesNotMatch(auth, /function handleScore/);
assert.doesNotMatch(auth, /RUNTIME_DATA_PATH/);

assert.doesNotMatch(authRoutes, /http\.createServer/);
assert.doesNotMatch(authRoutes, /async function route/);
assert.doesNotMatch(authRoutes, /function serveStatic/);
assert.doesNotMatch(authRoutes, /function handleRuntime/);
assert.doesNotMatch(authRoutes, /function handleScore/);
assert.doesNotMatch(authRoutes, /RUNTIME_DATA_PATH/);

console.log("node auth boundary tests passed");
