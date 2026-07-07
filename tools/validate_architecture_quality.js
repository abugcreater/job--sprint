#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const repoRoot = path.resolve(__dirname, "..");

const excludedPrefixes = [
  ".git/",
  "node_modules/",
  "apps/react-web/node_modules/",
  "apps/rust-api/target/",
  "apps/android/.gradle/",
  "apps/android/app/build/",
  "apps/android/app/src/main/assets/react/",
  "dist/"
];

const sourceExtensions = new Set([".js", ".ts", ".tsx", ".java", ".rs"]);

const rustModules = [
  "app_bootstrap.rs",
  "app_schema.rs",
  "runtime_store.rs",
  "runtime_records.rs",
  "runtime_routes.rs",
  "data_routes.rs",
  "application_routes.rs",
  "interview_mistake_routes.rs",
  "ai_routes.rs",
  "static_routes.rs",
  "static_files.rs",
  "http_responses.rs",
  "login_rate.rs",
  "session_token.rs",
  "auth_account_actions.rs",
  "auth_config.rs",
  "auth_bearer.rs",
  "auth_tokens.rs",
  "auth_users.rs",
  "auth_values.rs",
  "auth_hash.rs",
  "auth_permissions.rs",
  "auth_state.rs",
  "auth_http.rs",
  "auth_routes.rs",
  "ai_tools.rs",
  "ai_transcribe.rs",
  "coach_ai_metadata.rs",
  "coach_ai_provider.rs",
  "coach_ai_provider_format.rs",
  "coach_ai_tools.rs",
  "coach_boundary_provider.rs",
  "coach_boundary_routes.rs",
  "coach_boundary_suggestions.rs",
  "coach_invitation_action_routes.rs",
  "coach_invitation_routes.rs",
  "coach_invitations.rs",
  "coach_onboarding_event_summary.rs",
  "coach_onboarding_events.rs",
  "coach_onboarding_report.rs",
  "coach_onboarding_routes.rs",
  "coach_opportunity_signal_parse.rs",
  "coach_opportunity_signals.rs",
  "coach_role_playbook.rs",
  "health_routes.rs",
  "llm_feedback.rs",
  "llm_feedback_summary.rs",
  "llm_runs.rs"
].map((name) => `apps/rust-api/src/${name}`);

const androidModules = [
  "RemoteUrlPolicy.java",
  "AuthCredentialStore.java",
  "AndroidKeystoreStringCipher.java",
  "RemoteWebViewController.java",
  "AndroidRemoteSettingsBridge.java",
  "AndroidAuthSettingsBridge.java",
  "AndroidSessionCookieBridge.java",
  "AndroidRecorderBridge.java",
  "AndroidRecorderUploader.java",
  "AndroidTranscribeEndpointResolver.java",
  "AndroidSpeechServiceResolver.java",
  "AndroidSpeechErrorPolicy.java",
  "AndroidSpeechErrorCoordinator.java",
  "AndroidSpeechSessionState.java",
  "AndroidSpeechCallbackEmitter.java",
  "AndroidSpeechStartCoordinator.java",
  "AndroidSpeechRecognizerController.java",
  "AndroidSpeechBridge.java",
  "AndroidBasicAuthController.java",
  "AndroidWebChromePermissionController.java",
  "AndroidRemoteWebViewClient.java",
  "AndroidActivityLifecycleController.java",
  "AndroidWindowLayoutController.java",
  "AndroidWebViewInitializer.java",
  "AndroidAppStartupController.java"
].map((name) => `apps/android/app/src/main/java/com/kai/jobsprint/${name}`);

const nodeModules = [
  "auth.js",
  "auth_routes.js",
  "runtime_store.js",
  "runtime_routes.js",
  "static_files.js",
  "ai_routes.js",
  "ai_tools.js",
  "http_utils.js"
].map((name) => `apps/server/${name}`);

const defaultPolicy = {
  requiredFiles: [
    ...rustModules,
    ...androidModules,
    ...nodeModules
  ],
  sameHashGroups: [
    {
      id: "legacy_schedule_android_fallback_copy",
      files: [
        "assets/schedule.js",
        "apps/android/app/src/main/assets/web/assets/schedule.js"
      ]
    }
  ],
  semanticBoundaryRules: [
    {
      id: "rust_lib_declares_architecture_modules",
      type: "rust_modules",
      file: "apps/rust-api/src/lib.rs",
      requiredModules: rustModules.map((file) => path.basename(file, ".rs")),
      reason: "Rust lib.rs 必须显式装配已拆分模块，避免模块存在但未接入主后端。"
    },
    {
      id: "node_app_requires_only_compat_modules",
      type: "node_requires",
      file: "apps/server/app.js",
      allowedRequires: [
        "http",
        "./auth",
        "./auth_routes",
        "./ai_routes",
        "./coach_feedback_routes",
        "./runtime_store",
        "./runtime_routes",
        "./static_files",
        "./ai_tools",
        "./http_utils"
      ],
      requiredRequires: [
        "./auth",
        "./auth_routes",
        "./ai_routes",
        "./coach_feedback_routes",
        "./runtime_store",
        "./runtime_routes",
        "./static_files",
        "./ai_tools",
        "./http_utils"
      ],
      reason: "Node app.js 只能作为兼容装配层，不得重新直接持有 fs/path/crypto 或新增业务依赖。"
    },
    {
      id: "android_main_activity_stays_startup_shell",
      type: "java_new_classes",
      file: "apps/android/app/src/main/java/com/kai/jobsprint/MainActivity.java",
      allowedNewClasses: ["AndroidAppStartupController"],
      requiredNewClasses: ["AndroidAppStartupController"],
      reason: "MainActivity 只能创建启动编排器，WebView/认证/语音/录音职责必须留在专用 controller/bridge。"
    }
  ],
  fileLineBudgets: [
    {
      file: "assets/schedule.js",
      maxLines: 3600,
      reason: "旧 schedule.js 只能作为冻结兼容入口存在，新增能力应进入 React/Rust 边界。"
    },
    {
      file: "apps/android/app/src/main/assets/web/assets/schedule.js",
      maxLines: 3600,
      reason: "Android fallback 旧 schedule.js 必须跟随冻结兼容入口，不能单独膨胀。"
    },
    {
      file: "tools/validate_final_delivery_readiness.js",
      maxLines: 1300,
      reason: "最终交付门禁继续增长时应拆分 evidence validator，而不是扩大单文件。"
    },
    {
      file: "tools/run_final_delivery.js",
      maxLines: 450,
      reason: "最终交付编排器应保持 orchestration 薄层。"
    },
    {
      file: "apps/rust-api/src/lib.rs",
      maxLines: 150,
      reason: "Rust lib.rs 必须保持薄路由/模块装配层。"
    },
    {
      file: "apps/server/app.js",
      maxLines: 220,
      reason: "Node 兼容服务入口必须保持薄装配层。"
    },
    {
      file: "apps/android/app/src/main/java/com/kai/jobsprint/MainActivity.java",
      maxLines: 80,
      reason: "MainActivity 必须保持启动装配层，业务逻辑留在专用 controller/bridge。"
    }
  ],
  patternLineBudgets: [
    {
      pattern: /^apps\/rust-api\/src\/.*\.rs$/,
      maxLines: 220,
      reason: "Rust 后端模块应保持单一语义边界。"
    },
    {
      pattern: /^apps\/server\/.*\.js$/,
      maxLines: 400,
      reason: "Node 兼容层只保留回滚/兼容责任，避免重新变成主后端。"
    },
    {
      pattern: /^apps\/android\/app\/src\/main\/java\/.*\.java$/,
      maxLines: 280,
      reason: "Android WebView/认证/录音/语音职责必须分散到可测试小类。"
    },
    {
      pattern: /^apps\/react-web\/src\/features\/.*\.tsx$/,
      maxLines: 560,
      reason: "React 页面允许承载交互，但不能继续堆成不可维护大页。"
    },
    {
      pattern: /^apps\/react-web\/src\/data\/.*\.ts$/,
      maxLines: 450,
      reason: "React 数据 adapter 应保持转换职责清晰。"
    },
    {
      pattern: /^apps\/react-web\/src\/.*\.(ts|tsx)$/,
      maxLines: 340,
      reason: "React 普通源码文件应保持小边界。"
    },
    {
      pattern: /^tools\/.*\.js$/,
      maxLines: 700,
      reason: "工具脚本超过阈值时应拆分 validator/helper。"
    },
    {
      pattern: /^tests\/.*\.js$/,
      maxLines: 800,
      reason: "测试文件可比生产文件更长，但仍需避免巨型脚本。"
    },
    {
      pattern: /^apps\/rust-api\/tests\/.*\.rs$/,
      maxLines: 800,
      reason: "Rust 合同测试可保留较长场景，但不能无上限增长。"
    }
  ]
};

function toRepoPath(file) {
  return file.split(path.sep).join("/");
}

function isExcluded(relativePath) {
  return excludedPrefixes.some((prefix) => relativePath === prefix.slice(0, -1) || relativePath.startsWith(prefix));
}

function collectSourceFiles(root, dir = root, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = toRepoPath(path.relative(root, fullPath));
    if (isExcluded(relativePath)) continue;
    if (entry.isDirectory()) {
      collectSourceFiles(root, fullPath, files);
    } else if (sourceExtensions.has(path.extname(entry.name))) {
      files.push(relativePath);
    }
  }
  return files;
}

function readText(root, file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function lineCount(text) {
  if (!text) return 0;
  const lines = text.split(/\r?\n/).length;
  return text.endsWith("\n") ? lines - 1 : lines;
}

function sha256(root, file) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(root, file))).digest("hex");
}

function rustModulesIn(text) {
  return [...text.matchAll(/^\s*(?:pub(?:\([^)]*\))?\s+)?mod\s+([A-Za-z0-9_]+)\s*;/gm)]
    .map((match) => match[1])
    .sort();
}

function nodeRequiresIn(text) {
  return [...text.matchAll(/\brequire\(\s*["']([^"']+)["']\s*\)/g)]
    .map((match) => match[1])
    .sort();
}

function javaNewClassesIn(text) {
  return [...text.matchAll(/\bnew\s+([A-Z][A-Za-z0-9_]*)\s*\(/g)]
    .map((match) => match[1])
    .sort();
}

function exactBudgetFor(policy, file) {
  return (policy.fileLineBudgets || []).find((budget) => budget.file === file);
}

function patternBudgetFor(policy, file) {
  return (policy.patternLineBudgets || []).find((budget) => budget.pattern.test(file)) || null;
}

function sortedMissing(expected, actual) {
  const actualSet = new Set(actual);
  return expected.filter((item) => !actualSet.has(item)).sort();
}

function sortedUnexpected(actual, allowed) {
  const allowedSet = new Set(allowed);
  return actual.filter((item) => !allowedSet.has(item)).sort();
}

function semanticBoundaryFindings(root, rule) {
  const file = path.join(root, rule.file);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    return [{
      code: "semantic_boundary_file_missing",
      severity: "error",
      rule: rule.id,
      file: rule.file,
      reason: rule.reason
    }];
  }

  const text = fs.readFileSync(file, "utf8");
  if (rule.type === "rust_modules") {
    const modules = rustModulesIn(text);
    const missing = sortedMissing(rule.requiredModules || [], modules);
    return missing.length
      ? [{
          code: "semantic_boundary_rust_module_missing",
          severity: "error",
          rule: rule.id,
          file: rule.file,
          missing,
          actual: modules,
          reason: rule.reason
        }]
      : [];
  }

  if (rule.type === "node_requires") {
    const requires = nodeRequiresIn(text);
    const missing = sortedMissing(rule.requiredRequires || [], requires);
    const unexpected = sortedUnexpected(requires, rule.allowedRequires || []);
    return [
      ...(missing.length ? [{
        code: "semantic_boundary_node_require_missing",
        severity: "error",
        rule: rule.id,
        file: rule.file,
        missing,
        actual: requires,
        reason: rule.reason
      }] : []),
      ...(unexpected.length ? [{
        code: "semantic_boundary_node_require_unexpected",
        severity: "error",
        rule: rule.id,
        file: rule.file,
        unexpected,
        actual: requires,
        reason: rule.reason
      }] : [])
    ];
  }

  if (rule.type === "java_new_classes") {
    const newClasses = javaNewClassesIn(text);
    const missing = sortedMissing(rule.requiredNewClasses || [], newClasses);
    const unexpected = sortedUnexpected(newClasses, rule.allowedNewClasses || []);
    return [
      ...(missing.length ? [{
        code: "semantic_boundary_java_new_class_missing",
        severity: "error",
        rule: rule.id,
        file: rule.file,
        missing,
        actual: newClasses,
        reason: rule.reason
      }] : []),
      ...(unexpected.length ? [{
        code: "semantic_boundary_java_new_class_unexpected",
        severity: "error",
        rule: rule.id,
        file: rule.file,
        unexpected,
        actual: newClasses,
        reason: rule.reason
      }] : [])
    ];
  }

  return [{
    code: "semantic_boundary_rule_type_unknown",
    severity: "error",
    rule: rule.id,
    file: rule.file,
    type: rule.type
  }];
}

function validateArchitectureQuality(root = repoRoot, policy = defaultPolicy) {
  const findings = [];
  const metrics = {
    sourceFileCount: 0,
    largestFiles: [],
    requiredFileCount: (policy.requiredFiles || []).length,
    semanticBoundaryRuleCount: (policy.semanticBoundaryRules || []).length
  };

  for (const file of policy.requiredFiles || []) {
    if (!fs.existsSync(path.join(root, file))) {
      findings.push({
        code: "required_architecture_module_missing",
        severity: "error",
        file,
        reason: "目标架构要求的拆分模块缺失。"
      });
    }
  }

  for (const group of policy.sameHashGroups || []) {
    const missing = group.files.filter((file) => !fs.existsSync(path.join(root, file)));
    if (missing.length) {
      findings.push({
        code: "same_hash_file_missing",
        severity: "error",
        group: group.id,
        missing
      });
      continue;
    }
    const hashes = group.files.map((file) => ({ file, sha256: sha256(root, file) }));
    const uniqueHashes = new Set(hashes.map((item) => item.sha256));
    if (uniqueHashes.size > 1) {
      findings.push({
        code: "same_hash_group_mismatch",
        severity: "error",
        group: group.id,
        hashes,
        reason: "Android fallback 兼容文件必须与 Web 兼容入口一致，避免两端功能漂移。"
      });
    }
  }

  for (const rule of policy.semanticBoundaryRules || []) {
    findings.push(...semanticBoundaryFindings(root, rule));
  }

  const sourceFiles = collectSourceFiles(root).sort();
  metrics.sourceFileCount = sourceFiles.length;
  const largestFiles = [];
  for (const file of sourceFiles) {
    const lines = lineCount(readText(root, file));
    largestFiles.push({ file, lines });
    const budget = exactBudgetFor(policy, file) || patternBudgetFor(policy, file);
    if (budget && lines > budget.maxLines) {
      findings.push({
        code: "line_budget_exceeded",
        severity: "error",
        file,
        lines,
        maxLines: budget.maxLines,
        reason: budget.reason
      });
    }
  }
  metrics.largestFiles = largestFiles.sort((left, right) => right.lines - left.lines).slice(0, 15);

  return {
    ok: findings.length === 0,
    findings,
    metrics
  };
}

function printReport(report) {
  if (process.argv.includes("--json")) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }
  if (report.ok) {
    console.log(`架构质量门禁通过：检查 ${report.metrics.sourceFileCount} 个源码文件。`);
  } else {
    console.log(`架构质量门禁失败：发现 ${report.findings.length} 个阻断问题。`);
    report.findings.forEach((finding) => {
      const location = finding.file || finding.group || "(repo)";
      const detail = finding.lines ? ` ${finding.lines}/${finding.maxLines} 行` : "";
      console.log(`- ${location} [${finding.code}]${detail} ${finding.reason || ""}`.trim());
    });
  }
  console.log("最大源码文件：");
  report.metrics.largestFiles.slice(0, 8).forEach((item) => {
    console.log(`- ${item.file}: ${item.lines} 行`);
  });
}

if (require.main === module) {
  const report = validateArchitectureQuality(repoRoot);
  printReport(report);
  if (!report.ok) process.exitCode = 1;
}

module.exports = {
  validateArchitectureQuality,
  defaultPolicy,
  lineCount,
  rustModulesIn,
  nodeRequiresIn,
  javaNewClassesIn
};
