(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.ScheduleApp = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const FIXED_OFFSET = "+08:00";
  const COMPLETED_KEY = "jobSprint.completed.v1";
  const REVIEWS_KEY = "jobSprint.reviews.v1";
  const APPLICATIONS_KEY = "jobSprint.applications.v1";
  const DELAYS_KEY = "jobSprint.delays.v1";
  const INTERVIEW_SESSIONS_KEY = "jobSprint.interviewSessions.v1";
  const INTERVIEW_MISTAKES_KEY = "jobSprint.interviewMistakes.v1";
  const KB_FAVORITES_KEY = "jobSprint.kbFavorites.v1";
  const KB_MANUAL_MISTAKES_KEY = "jobSprint.kbMistakes.v1";
  const GENERATED_KB_KEY = "jobSprint.generatedKb.v1";
  const PLAN_SETTINGS_KEY = "jobSprint.planSettings.v1";
  const APP_VIEW_KEY = "jobSprint.activeView.v1";
  const APPLICATION_STATUSES = ["已记录", "待沟通", "已沟通", "约面", "不匹配"];
  const NAV_META = [
    { id: "today", label: "今日", title: "今日", group: "today", groupLabel: "今日", permission: "module:today" },
    { id: "schedule", label: "日程", title: "日程", group: "learning", groupLabel: "知识", permission: "module:schedule" },
    { id: "knowledge", label: "知识库", title: "知识库", group: "learning", groupLabel: "知识", permission: "module:knowledge" },
    { id: "interview", label: "面试", title: "面试", group: "interview", groupLabel: "面试", permission: "module:interview" },
    { id: "applications", label: "机会", title: "机会", group: "applications", groupLabel: "机会", permission: "module:applications" },
    { id: "review", label: "复盘", title: "复盘", group: "support", groupLabel: "更多", permission: "module:review" },
    { id: "tools", label: "维护", title: "维护与导出", group: "support", groupLabel: "更多", permission: "module:tools" },
    { id: "settings", label: "设置", title: "设置", group: "support", groupLabel: "更多", permission: "module:settings" }
  ];
  const CATEGORY_META = {
    project: { label: "项目", group: "primary", showInMainFilter: true, order: 10 },
    agent: { label: "供小慧", group: "primary", showInMainFilter: true, order: 20 },
    rag: { label: "RAG", group: "primary", showInMainFilter: true, order: 30 },
    java: { label: "Java", group: "primary", showInMainFilter: true, order: 40 },
    interview: { label: "面试", group: "primary", showInMainFilter: true, order: 50 },
    resume: { label: "简历/机会", group: "primary", showInMainFilter: true, order: 60 },
    delivery: { label: "简历/机会", group: "primary", showInMainFilter: false, order: 61 },
    review: { label: "复盘", group: "secondary", showInMainFilter: false, order: 120 },
    rest: { label: "休息缓冲", group: "secondary", showInMainFilter: false, order: 130 },
    deployment: { label: "云端发布", group: "engineering", showInMainFilter: false, order: 200 },
    android: { label: "APK 打包", group: "engineering", showInMainFilter: false, order: 210 },
    "path-missing": { label: "路径问题", group: "engineering", showInMainFilter: false, order: 220 },
    "path-audit": { label: "路径审计", group: "engineering", showInMainFilter: false, order: 230 },
    "public-safe": { label: "public-safe", group: "engineering", showInMainFilter: false, order: 240 },
    "health-check": { label: "健康检查", group: "engineering", showInMainFilter: false, order: 250 }
  };

  function parseSgDateTime(date, time) {
    return new Date(`${date}T${time}:00${FIXED_OFFSET}`);
  }

  function flattenBlocks(schedule) {
    const rows = [];
    schedule.days.forEach((day, dayIndex) => {
      day.blocks.forEach((block, blockIndex) => {
        rows.push({
          ...block,
          day,
          dayIndex,
          blockIndex,
          startDateTime: parseSgDateTime(day.date, block.start),
          endDateTime: parseSgDateTime(block.endDate || day.date, block.end)
        });
      });
    });
    return rows.sort((a, b) => a.startDateTime - b.startDateTime);
  }

  function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function formatSgDate(date) {
    return getDatePartsInZone(date, "Asia/Singapore").date;
  }

  function formatSgTime(date) {
    return getDatePartsInZone(date, "Asia/Singapore").time.slice(0, 5);
  }

  function addDays(date, days) {
    const next = new Date(`${date}T00:00:00${FIXED_OFFSET}`);
    next.setUTCDate(next.getUTCDate() + days);
    return formatSgDate(next);
  }

  function daysBetween(startDate, endDate) {
    const start = new Date(`${startDate}T00:00:00${FIXED_OFFSET}`).getTime();
    const end = new Date(`${endDate}T00:00:00${FIXED_OFFSET}`).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
    return Math.round((end - start) / 86400000);
  }

  function shiftScheduleDates(schedule, actualStartDate) {
    if (!actualStartDate || actualStartDate === schedule.startDate) {
      return schedule;
    }
    const deltaDays = daysBetween(schedule.startDate, actualStartDate);
    const days = schedule.days.map((day) => ({
      ...cloneJson(day),
      originalDate: day.originalDate || day.date,
      date: addDays(day.date, deltaDays),
      blocks: day.blocks.map((block) => ({
        ...cloneJson(block),
        originalDate: block.originalDate || day.date,
        endDate: block.endDate ? addDays(block.endDate, deltaDays) : block.endDate
      }))
    }));
    return {
      ...cloneJson(schedule),
      version: `${schedule.version || "schedule"}+custom-start`,
      startDate: actualStartDate,
      endDate: days.length ? days[days.length - 1].date : schedule.endDate,
      days
    };
  }

  function applyPlanDelays(schedule, delays = [], completed = {}) {
    if (!Array.isArray(delays) || delays.length === 0) {
      return schedule;
    }

    const sortedDelays = delays
      .filter((delay) => delay && delay.start && delay.end && Number(delay.minutes) > 0)
      .map((delay) => ({
        ...delay,
        startDateTime: new Date(delay.start),
        endDateTime: new Date(delay.end)
      }))
      .filter((delay) => Number.isFinite(delay.startDateTime.getTime()) && Number.isFinite(delay.endDateTime.getTime()))
      .sort((a, b) => a.startDateTime - b.startDateTime);

    if (sortedDelays.length === 0) {
      return schedule;
    }

    const dayMeta = new Map(schedule.days.map((day) => [day.date, day]));
    let lastUncompletedEnd = null;
    const shiftedBlocks = flattenBlocks(schedule).map((block) => {
      const originalStartMs = block.startDateTime.getTime();
      const originalEndMs = block.endDateTime.getTime();
      const durationMs = originalEndMs - originalStartMs;
      let effectiveStart = new Date(originalStartMs);
      let effectiveEnd = new Date(originalEndMs);
      let shiftMs = 0;
      for (const delay of sortedDelays) {
        if (completed[block.id]) {
          break;
        }
        const delayStartMs = delay.startDateTime.getTime();
        const delayEndMs = delay.endDateTime.getTime();
        const delayDurationMs = delayEndMs - delayStartMs;
        if (effectiveEnd.getTime() <= delayStartMs) {
          continue;
        }
        if (effectiveStart.getTime() < delayEndMs) {
          effectiveStart = new Date(delayEndMs);
          effectiveEnd = new Date(effectiveStart.getTime() + durationMs);
        } else {
          effectiveStart = new Date(effectiveStart.getTime() + delayDurationMs);
          effectiveEnd = new Date(effectiveEnd.getTime() + delayDurationMs);
        }
      }
      if (!completed[block.id] && lastUncompletedEnd && effectiveStart.getTime() < lastUncompletedEnd.getTime()) {
        effectiveStart = new Date(lastUncompletedEnd.getTime());
        effectiveEnd = new Date(effectiveStart.getTime() + durationMs);
      }
      if (!completed[block.id]) {
        lastUncompletedEnd = effectiveEnd;
        shiftMs = effectiveStart.getTime() - originalStartMs;
      }
      return {
        ...cloneJson(block),
        originalDate: block.day.date,
        originalStart: block.start,
        originalEnd: block.end,
        start: formatSgTime(effectiveStart),
        end: formatSgTime(effectiveEnd),
        endDate: formatSgDate(effectiveEnd),
        effectiveDate: formatSgDate(effectiveStart),
        delayMinutes: Math.round(shiftMs / 60000)
      };
    });

    const grouped = new Map();
    shiftedBlocks.forEach((block) => {
      if (!grouped.has(block.effectiveDate)) {
        grouped.set(block.effectiveDate, []);
      }
      grouped.get(block.effectiveDate).push(block);
    });

    const days = Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, blocks], index) => {
        const source = dayMeta.get(date);
        const sourceFromBlock = dayMeta.get(blocks[0].originalDate);
        const day = source || {
          date,
          weekday: new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Singapore", weekday: "short" }).format(parseSgDateTime(date, "08:00")),
          theme: "顺延补做",
          goal: "补做因突发事件顺延的未完成任务",
          risk: "任务被顺延后仍需完成，不能默认为跳过",
          dailyDeliverables: [],
          mustAnswer: [],
          javaFocus: sourceFromBlock ? sourceFromBlock.javaFocus : "按顺延任务补强"
        };
        return {
          ...cloneJson(day),
          date,
          blocks: blocks
            .sort((a, b) => a.start.localeCompare(b.start))
            .map((block) => {
              const clean = cloneJson(block);
              delete clean.day;
              delete clean.startDateTime;
              delete clean.endDateTime;
              delete clean.effectiveDate;
              return clean;
            })
        };
      });

    return {
      ...cloneJson(schedule),
      version: `${schedule.version || "schedule"}+local-delays`,
      endDate: days.length ? days[days.length - 1].date : schedule.endDate,
      days
    };
  }

  function getDatePartsInZone(date, timeZone) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).formatToParts(date);

    const mapped = {};
    parts.forEach((part) => {
      if (part.type !== "literal") {
        mapped[part.type] = part.value;
      }
    });

    return {
      date: `${mapped.year}-${mapped.month}-${mapped.day}`,
      time: `${mapped.hour}:${mapped.minute}:${mapped.second}`
    };
  }

  function formatNowInZone(date, timeZone) {
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).format(date);
  }

  function formatDuration(ms) {
    if (!Number.isFinite(ms) || ms <= 0) {
      return "0 分钟";
    }
    const totalMinutes = Math.ceil(ms / 60000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    const parts = [];
    if (days) parts.push(`${days}天`);
    if (hours) parts.push(`${hours}小时`);
    if (minutes || parts.length === 0) parts.push(`${minutes}分钟`);
    return parts.join(" ");
  }

  function blockDelayLabel(block) {
    const minutes = Number(block && block.delayMinutes ? block.delayMinutes : 0);
    return minutes > 0 ? `顺延补做 ${formatDuration(minutes * 60000)}` : "";
  }

  function getDayByDate(schedule, date) {
    return schedule.days.find((day) => day.date === date) || null;
  }

  function getPlanState(schedule, now = new Date()) {
    const timeZone = schedule.timezone || "Asia/Singapore";
    const blocks = flattenBlocks(schedule);
    const nowMs = now.getTime();
    const first = blocks[0];
    const last = blocks[blocks.length - 1];
    const zoneDate = getDatePartsInZone(now, timeZone).date;
    const today = getDayByDate(schedule, zoneDate);

    if (!first || !last) {
      return {
        code: "empty",
        status: "计划为空",
        current: null,
        next: null,
        today,
        zoneDate,
        blocks
      };
    }

    if (nowMs < first.startDateTime.getTime()) {
      return {
        code: "before",
        status: "计划尚未开始",
        current: null,
        next: first,
        today: getDayByDate(schedule, schedule.startDate) || today,
        zoneDate,
        blocks
      };
    }

    if (nowMs >= last.endDateTime.getTime()) {
      return {
        code: "after",
        status: "计划已结束",
        current: null,
        next: null,
        today: getDayByDate(schedule, schedule.endDate) || today,
        zoneDate,
        blocks
      };
    }

    const current = blocks.find((block) => {
      return nowMs >= block.startDateTime.getTime() && nowMs < block.endDateTime.getTime();
    }) || null;
    const next = blocks.find((block) => block.startDateTime.getTime() > nowMs) || null;

    if (current) {
      return {
        code: "running",
        status: "任务进行中",
        current,
        next,
        today: current.day,
        zoneDate,
        blocks
      };
    }

    const hasRemainingToday = today
      ? today.blocks.some((block) => parseSgDateTime(today.date, block.start).getTime() > nowMs)
      : false;

    return {
      code: hasRemainingToday ? "waiting" : "day-ended",
      status: hasRemainingToday ? "等待下一个任务" : "今日任务已结束",
      current: null,
      next,
      today: today || (next ? next.day : null),
      zoneDate,
      blocks
    };
  }

  function categoryLabel(schedule, category) {
    return (CATEGORY_META[category] && CATEGORY_META[category].label)
      || (schedule.categories && schedule.categories[category])
      || category;
  }

  function categoriesByGroup(group) {
    return Object.entries(CATEGORY_META)
      .filter(([, meta]) => meta.group === group)
      .sort((a, b) => a[1].order - b[1].order);
  }

  function arraysToText(value) {
    if (Array.isArray(value)) {
      return value.map((item) => itemToSearchText(item)).join(" ");
    }
    return itemToSearchText(value);
  }

  function itemToSearchText(item) {
    if (!item) return "";
    if (typeof item === "string") return item;
    if (typeof item === "number") return String(item);
    if (typeof item === "object") {
      return [
        item.label,
        item.usage,
        item.rootName,
        item.relativePath,
        item.path,
        item.absolutePath,
        item.openCommand,
        item.copyCommand,
        item.command,
        item.status
      ].filter(Boolean).join(" ");
    }
    return String(item);
  }

  function matchesBlock(block, filters, completed) {
    if (filters.category === "path-missing" && block.pathStatus === "all-ok") {
      return false;
    }
    if (filters.category && filters.category !== "all" && filters.category !== "path-missing" && !categoryMatchesFilter(block.category, filters.category)) {
      return false;
    }
    if (filters.unfinishedOnly && completed[block.id]) {
      return false;
    }
    const query = (filters.query || "").trim().toLowerCase();
    if (!query) {
      return true;
    }
    const haystack = [
      block.title,
      block.description,
      arraysToText(block.deliverables),
      arraysToText(block.interviewQuestions),
      block.javaMapping,
      block.acceptance,
      block.pathStatus,
      arraysToText(block.mustRead),
      arraysToText(block.commands),
      arraysToText(block.absolutePaths),
      arraysToText(block.openCommands)
    ].join(" ").toLowerCase();
    return haystack.includes(query);
  }

  function categoryMatchesFilter(blockCategory, selectedCategory) {
    if (selectedCategory === "resume") {
      return blockCategory === "resume" || blockCategory === "delivery";
    }
    return blockCategory === selectedCategory;
  }

  function readJsonStorage(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      console.warn(`读取 localStorage 失败: ${key}`, error);
      return fallback;
    }
  }

  function writeJsonStorage(key, value) {
    window.localStorage.setItem(key, JSON.stringify(value, null, 2));
  }

  function readPlanSettings() {
    const fallback = {
      mode: "real",
      actualStartDate: "",
      simulateDay: "1"
    };
    const settings = readJsonStorage(PLAN_SETTINGS_KEY, fallback);
    return {
      ...fallback,
      ...settings,
      mode: ["real", "custom-start", "simulate-day"].includes(settings.mode) ? settings.mode : "real"
    };
  }

  function savePlanSettings(settings) {
    writeJsonStorage(PLAN_SETTINGS_KEY, settings);
  }

  function getScheduleForSettings(schedule, settings) {
    if (settings.mode === "custom-start" && settings.actualStartDate) {
      return shiftScheduleDates(schedule, settings.actualStartDate);
    }
    return schedule;
  }

  function getEffectiveNow(schedule, settings, realNow = new Date()) {
    if (settings.mode !== "simulate-day") {
      return realNow;
    }
    const dayIndex = Math.max(0, Math.min((schedule.days || []).length - 1, Number(settings.simulateDay || 1) - 1));
    const day = schedule.days[dayIndex] || schedule.days[0];
    const time = formatSgTime(realNow);
    return parseSgDateTime(day.date, time);
  }

  function planModeLabel(settings) {
    if (settings.mode === "simulate-day") {
      return `模拟日期模式 · Day ${settings.simulateDay || 1}`;
    }
    if (settings.mode === "custom-start") {
      return `自定义起始日模式 · ${settings.actualStartDate || "未设置"}`;
    }
    return "真实日期模式";
  }

  function appBasePath() {
    if (typeof window === "undefined") return "";
    const pathname = window.location && window.location.pathname ? window.location.pathname : "/";
    const marker = "/schedule.html";
    if (pathname.endsWith(marker)) {
      return pathname.slice(0, -marker.length);
    }
    if (pathname.endsWith("/")) {
      return pathname.slice(0, -1);
    }
    return "";
  }

  function resolveAppPath(path) {
    if (!path || !path.startsWith("/")) return path;
    return `${appBasePath()}${path}`;
  }

  function mergeObjectState(serverState, localState) {
    return {
      ...(serverState && typeof serverState === "object" ? serverState : {}),
      ...(localState && typeof localState === "object" ? localState : {})
    };
  }

  function mergeArrayState(serverRows, localRows) {
    const merged = new Map();
    const addRows = (rows, source) => {
      (Array.isArray(rows) ? rows : []).forEach((row, index) => {
        if (!row || typeof row !== "object") return;
        const key = row.id || `${source}-${index}-${JSON.stringify(row).slice(0, 80)}`;
        merged.set(key, { ...merged.get(key), ...row });
      });
    };
    addRows(serverRows, "server");
    addRows(localRows, "local");
    return Array.from(merged.values());
  }

  async function apiJson(path, options = {}) {
    const response = await fetch(resolveAppPath(path), {
      headers: options.body ? { "content-type": "application/json" } : {},
      ...options,
      body: options.body && typeof options.body !== "string" ? JSON.stringify(options.body) : options.body
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  }

  async function loadServerRuntimeState(app) {
    try {
      const [progress, reviews, applications, mistakes] = await Promise.all([
        apiJson("/api/progress"),
        apiJson("/api/reviews"),
        apiJson("/api/applications"),
        apiJson("/api/interview-mistakes")
      ]);
      const readOnly = isReadOnly(app) || progress.readOnly || reviews.readOnly || applications.readOnly || mistakes.readOnly;
      const mergedProgress = readOnly ? (progress.progress || {}) : mergeObjectState(progress.progress, readJsonStorage(COMPLETED_KEY, {}));
      const mergedReviews = readOnly ? (reviews.reviews || {}) : mergeObjectState(reviews.reviews, readJsonStorage(REVIEWS_KEY, {}));
      const mergedApplications = readOnly ? (applications.applications || []) : mergeArrayState(applications.applications, readJsonStorage(APPLICATIONS_KEY, []));
      const mergedMistakes = readOnly ? (mistakes.interviewMistakes || []) : mergeArrayState(mistakes.interviewMistakes, readJsonStorage(INTERVIEW_MISTAKES_KEY, []));
      writeJsonStorage(COMPLETED_KEY, mergedProgress);
      writeJsonStorage(REVIEWS_KEY, mergedReviews);
      writeJsonStorage(APPLICATIONS_KEY, mergedApplications);
      writeJsonStorage(INTERVIEW_MISTAKES_KEY, mergedMistakes);
      if (!readOnly) {
        syncProgress(mergedProgress);
        syncReviews(mergedReviews);
        syncApplications(mergedApplications);
        syncInterviewMistakes(mergedMistakes);
      }
      app.storageMode = "server";
    } catch (_) {
      app.storageMode = "localStorage fallback";
    }
  }

  function syncProgress(completed) {
    apiJson("/api/progress", { method: "POST", body: { progress: completed } }).catch(() => {});
  }

  function syncReviews(reviews) {
    apiJson("/api/reviews", { method: "POST", body: { reviews } }).catch(() => {});
  }

  function syncApplicationCreate(record) {
    apiJson("/api/applications", { method: "POST", body: record }).catch(() => {});
  }

  function syncApplications(records) {
    apiJson("/api/applications", { method: "POST", body: { applications: records } }).catch(() => {});
  }

  function syncApplicationDelete(id) {
    apiJson(`/api/applications/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
  }

  function syncInterviewMistake(record) {
    apiJson("/api/interview-mistakes", { method: "POST", body: record }).catch(() => {});
  }

  function syncInterviewMistakes(records) {
    apiJson("/api/interview-mistakes", { method: "POST", body: { interviewMistakes: records } }).catch(() => {});
  }

  function downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function buildPathAudit(schedule) {
    const rows = [];
    (schedule.days || []).forEach((day) => {
      (day.blocks || []).forEach((block) => {
        (block.mustRead || []).forEach((item) => {
          rows.push({
            date: day.date,
            blockId: block.id,
            title: block.title,
            label: item.label,
            rootName: item.rootName,
            relativePath: item.relativePath,
            absolutePath: item.absolutePath,
            exists: item.exists,
            status: item.status,
            openCommand: item.openCommand,
            usage: item.usage
          });
        });
      });
    });
    return {
      generatedAt: new Date().toISOString(),
      totals: {
        rows: rows.length,
        ok: rows.filter((item) => item.exists !== false && item.status !== "missing").length,
        missing: rows.filter((item) => item.exists === false || item.status === "missing").length
      },
      rows
    };
  }

  function copyText(text) {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  }

  function formatListItem(item) {
    if (!item) return "暂无";
    if (typeof item === "string") return item;
    if (typeof item === "object") {
      const status = item.exists === false || item.status === "missing" ? "缺失" : (item.status || "存在");
      const pathText = item.absolutePath || item.path || item.relativePath || item.command || "";
      const usage = item.usage ? `；用途：${item.usage}` : "";
      const command = item.copyCommand || item.openCommand || item.codeCommand || "";
      return [item.label || item.command || pathText, pathText ? `路径/命令：${pathText}` : "", `状态：${status}${usage}`, command ? `复制：${command}` : ""].filter(Boolean).join(" | ");
    }
    return String(item);
  }

  function createList(items) {
    const list = document.createElement("ul");
    list.className = "compact-list";
    const values = Array.isArray(items) ? items : (items ? [items] : []);
    if (values.length === 0) {
      const empty = document.createElement("li");
      empty.className = "muted";
      empty.textContent = "暂无";
      list.appendChild(empty);
      return list;
    }
    values.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = formatListItem(item);
      list.appendChild(li);
    });
    return list;
  }

  function setList(element, items) {
    const list = createList(items);
    element.replaceChildren(...Array.from(list.childNodes));
  }

  function clearAndAppend(element, child) {
    element.innerHTML = "";
    element.appendChild(child);
  }

  function navMeta(view) {
    return NAV_META.find((item) => item.id === view) || NAV_META[0];
  }

  function authUser(app) {
    return app.authState && app.authState.user ? app.authState.user : null;
  }

  function permissions(app) {
    const user = authUser(app);
    return user && Array.isArray(user.permissions) ? user.permissions : [];
  }

  function can(app, permission) {
    const userPermissions = permissions(app);
    return userPermissions.includes("*") || userPermissions.includes(permission);
  }

  function isReadOnly(app) {
    const user = authUser(app);
    return Boolean(user && user.readOnly);
  }

  function viewAllowed(app, view) {
    if (!authUser(app)) {
      return true;
    }
    const meta = navMeta(view);
    return !meta.permission || can(app, meta.permission);
  }

  function allowedNavItems(app) {
    if (!authUser(app)) {
      return NAV_META;
    }
    return NAV_META.filter((item) => viewAllowed(app, item.id));
  }

  function firstAllowedView(app) {
    const items = allowedNavItems(app);
    return items.length ? items[0].id : "today";
  }

  function navGroup(view) {
    return navMeta(view).group || navMeta(view).id;
  }

  function navSiblings(app, view) {
    const group = navGroup(view);
    return allowedNavItems(app).filter((item) => (item.group || item.id) === group);
  }

  function androidRemoteSettingsBridge() {
    return typeof window !== "undefined" ? window.AndroidRemoteSettings : null;
  }

  function androidAuthSettingsBridge() {
    return typeof window !== "undefined" ? window.AndroidAuthSettings : null;
  }

  function androidSessionCookieBridge() {
    return typeof window !== "undefined" ? window.AndroidSessionCookies : null;
  }

  function renderAndroidSettings(els) {
    const remoteBridge = androidRemoteSettingsBridge();
    const authBridge = androidAuthSettingsBridge();
    const sessionBridge = androidSessionCookieBridge();
    const available = remoteBridge && typeof remoteBridge.getRemoteUrl === "function";
    if (els.androidSettingsForm) {
      els.androidSettingsForm.hidden = !available;
    }
    if (!available) {
      if (els.androidSettingsStatus) {
        els.androidSettingsStatus.textContent = "当前不是 Android App WebView；远端地址和 Basic Auth 凭据在 App 内配置。";
      }
      return;
    }
    let remoteUrl = "";
    let hasAuth = false;
    let hasSessionCookie = false;
    try {
      remoteUrl = remoteBridge.getRemoteUrl();
      hasAuth = authBridge && typeof authBridge.hasSavedBasicAuth === "function"
        ? Boolean(authBridge.hasSavedBasicAuth())
        : false;
      hasSessionCookie = sessionBridge && typeof sessionBridge.hasSessionCookie === "function"
        ? Boolean(sessionBridge.hasSessionCookie())
        : false;
    } catch (_) {
      remoteUrl = "";
    }
    if (els.androidRemoteUrlInput && !els.androidRemoteUrlInput.matches(":focus")) {
      els.androidRemoteUrlInput.value = remoteUrl || "";
    }
    if (els.androidSettingsStatus) {
      els.androidSettingsStatus.textContent = `Android WebView 配置可用；Basic Auth：${hasAuth ? "已保存本机凭据" : "未保存本机凭据"}；Session：${hasSessionCookie ? "已保存 cookie" : "未检测到 cookie"}`;
    }
  }

  function renderWorkspaceChrome(app, els) {
    const meta = navMeta(app.activeView || "today");
    if (els.workspaceTitle) {
      els.workspaceTitle.textContent = meta.title;
    }
    const storageText = app.storageMode || "localStorage fallback";
    if (els.storageModePill) {
      els.storageModePill.textContent = storageText;
    }
    if (els.settingsStorageText) {
      els.settingsStorageText.textContent = storageText === "server"
        ? "server runtime：进度、复盘、机会记录和错题会同步到服务端 JSON。"
        : "localStorage fallback：服务端不可用时，数据暂存在当前浏览器。";
    }
    const base = appBasePath() || "/";
    if (els.serviceBaseText) {
      els.serviceBaseText.textContent = base === "/" ? "访问路径正常" : `路径：${base}/`;
    }
    if (els.settingsServiceText) {
      els.settingsServiceText.textContent = `${base === "/" ? "" : base}/schedule.html`;
    }
    if (els.runtimeNotice) {
      const isServer = storageText === "server";
      const user = authUser(app);
      if (user && user.readOnly) {
        els.runtimeNotice.classList.add("is-visible");
        els.runtimeNotice.textContent = `当前为访客只读模式：可以查看页面布局和功能范围，不能保存进度、机会记录、错题或调用 AI。`;
        renderSectionNav(app, els);
        renderAndroidSettings(els);
        applyPermissionControls(app, els);
        return;
      }
      if (els.storageModePill) {
        els.storageModePill.textContent = isServer ? "服务端同步" : "本地 fallback";
      }
      els.runtimeNotice.classList.toggle("is-visible", !isServer);
      els.runtimeNotice.textContent = isServer
        ? "服务端同步正常。"
        : "服务端暂不可用，当前使用本浏览器 localStorage fallback；保存仍可用，换设备前请先导出 JSON。";
    }
    renderSectionNav(app, els);
    renderAndroidSettings(els);
    applyPermissionControls(app, els);
  }

  function setControlDisabled(control, disabled) {
    if (!control) return;
    control.disabled = Boolean(disabled);
    control.classList.toggle("is-disabled", Boolean(disabled));
    if (disabled) {
      control.setAttribute("aria-disabled", "true");
    } else {
      control.removeAttribute("aria-disabled");
    }
  }

  function setFormDisabled(form, disabled) {
    if (!form || !form.elements) return;
    Array.from(form.elements).forEach((element) => {
      if (element.type !== "hidden") {
        setControlDisabled(element, disabled);
      }
    });
  }

  function applyPermissionControls(app, els) {
    const readOnly = isReadOnly(app);
    const aiAllowed = can(app, "ai:use");
    [
      els.completeCurrentBtn,
      els.evidenceActionBtn,
      els.saveReviewBtn,
      els.startTodayBtn,
      els.resetPlanSettingsBtn,
      els.taskDetailCompleteBtn
    ].forEach((button) => setControlDisabled(button, readOnly));
    setFormDisabled(els.reviewForm, readOnly);
    setFormDisabled(els.applicationForm, readOnly);
    setFormDisabled(els.delayForm, readOnly);
    setFormDisabled(els.planSettingsForm, readOnly);

    [
      els.generateKbBtn,
      els.randomKbQuestionBtn,
      els.scoreAnswerBtn,
      els.voiceStartBtn,
      els.voiceStopBtn,
      els.kbPracticeBtn,
      els.kbMistakeBtn
    ].forEach((button) => setControlDisabled(button, readOnly || !aiAllowed));

    if (els.kbGenerateForm) {
      setFormDisabled(els.kbGenerateForm, readOnly || !aiAllowed);
    }
    if (els.voiceStatus && authUser(app) && !aiAllowed) {
      els.voiceStatus.textContent = "访客只读模式不可使用语音评分。";
    }
  }

  function renderSectionNav(app, els) {
    if (!els.sectionNav) return;
    const siblings = navSiblings(app, app.activeView || "today");
    if (siblings.length <= 1) {
      els.sectionNav.hidden = true;
      els.sectionNav.innerHTML = "";
      return;
    }
    els.sectionNav.hidden = false;
    els.sectionNav.innerHTML = siblings.map((item) => {
      const active = item.id === app.activeView ? " active" : "";
      const ariaCurrent = item.id === app.activeView ? ' aria-current="page"' : "";
      return `<button type="button" class="section-nav-btn${active}" data-section-view="${escapeHtml(item.id)}"${ariaCurrent}>${escapeHtml(item.label)}</button>`;
    }).join("");
    els.sectionNav.querySelectorAll("[data-section-view]").forEach((button) => {
      button.addEventListener("click", () => {
        setActiveView(app, els, button.dataset.sectionView);
      });
    });
  }

  function setActiveView(app, els, view) {
    const targetView = viewAllowed(app, view) ? view : firstAllowedView(app);
    const meta = navMeta(targetView);
    app.activeView = meta.id;
    if (els.viewSections) {
      els.viewSections.forEach((section) => {
        section.classList.toggle("is-active", section.dataset.view === meta.id);
      });
    }
    if (els.appNav) {
      els.appNav.querySelectorAll("[data-view-target]").forEach((button) => {
        const allowed = viewAllowed(app, button.dataset.viewTarget);
        const active = allowed && navGroup(button.dataset.viewTarget) === navGroup(meta.id);
        button.hidden = !allowed;
        button.classList.toggle("active", active);
        button.setAttribute("aria-current", active ? "page" : "false");
      });
    }
    try {
      window.localStorage.setItem(APP_VIEW_KEY, meta.id);
    } catch (_) {
      // View persistence is optional in restricted WebView modes.
    }
    renderWorkspaceChrome(app, els);
  }

  function setupNavigation(app, els) {
    if (!els.appNav) return;
    els.appNav.querySelectorAll("[data-view-target]").forEach((button) => {
      button.addEventListener("click", () => {
        if (!viewAllowed(app, button.dataset.viewTarget)) return;
        setActiveView(app, els, button.dataset.viewTarget);
      });
    });
    setActiveView(app, els, app.activeView || "today");
  }

  function mergeQuestionBank(existingQuestions, kbEntries) {
    const base = Array.isArray(existingQuestions) ? existingQuestions.slice() : [];
    const fromKb = (Array.isArray(kbEntries) ? kbEntries : []).map((entry) => ({
      id: `kb-${entry.id}`,
      mode: /JVM|Spring|MySQL|Redis|MQ|Java|稳定性/.test(entry.category || entry.title || "") ? "java-core" : "resume-java",
      source: `${entry.category} · ${entry.title}`,
      question: entry.interviewQuestion || entry.title,
      hint: entry.publicSummary || "按证据、边界、Java 映射回答。",
      expectedKeywords: [
        entry.category,
        entry.javaMapping,
        entry.projectEvidence,
        ...(entry.safeWording || [])
      ].filter(Boolean).join(" ").split(/[、\s/]+/).filter(Boolean).slice(0, 8),
      kbEntryId: entry.id
    }));
    return base.concat(fromKb);
  }

  function initBrowserApp() {
    const els = {
      appNav: document.getElementById("appNav"),
      sectionNav: document.getElementById("sectionNav"),
      workspaceTitle: document.getElementById("workspaceTitle"),
      storageModePill: document.getElementById("storageModePill"),
      serviceBaseText: document.getElementById("serviceBaseText"),
      runtimeNotice: document.getElementById("runtimeNotice"),
      settingsStorageText: document.getElementById("settingsStorageText"),
      settingsServiceText: document.getElementById("settingsServiceText"),
      androidSettingsPanel: document.getElementById("androidSettingsPanel"),
      androidSettingsForm: document.getElementById("androidSettingsForm"),
      androidRemoteUrlInput: document.getElementById("androidRemoteUrlInput"),
      androidSettingsStatus: document.getElementById("androidSettingsStatus"),
      reloadAndroidRemoteBtn: document.getElementById("reloadAndroidRemoteBtn"),
      useAndroidFallbackBtn: document.getElementById("useAndroidFallbackBtn"),
      clearAndroidAuthBtn: document.getElementById("clearAndroidAuthBtn"),
      clearAndroidSessionBtn: document.getElementById("clearAndroidSessionBtn"),
      reopenAndroidLoginBtn: document.getElementById("reopenAndroidLoginBtn"),
      viewSections: Array.from(document.querySelectorAll(".view-section")),
      nowText: document.getElementById("nowText"),
      dayText: document.getElementById("dayText"),
      stateText: document.getElementById("stateText"),
      progressText: document.getElementById("progressText"),
      storageText: document.getElementById("storageText"),
      authStatusText: document.getElementById("authStatusText"),
      logoutBtn: document.getElementById("logoutBtn"),
      currentBadge: document.getElementById("currentBadge"),
      currentTaskTitle: document.getElementById("currentTaskTitle"),
      currentTaskMeta: document.getElementById("currentTaskMeta"),
      planModeText: document.getElementById("planModeText"),
      currentTaskDescription: document.getElementById("currentTaskDescription"),
      countdownLabel: document.getElementById("countdownLabel"),
      countdownText: document.getElementById("countdownText"),
      completeCurrentBtn: document.getElementById("completeCurrentBtn"),
      evidenceStatusTag: document.getElementById("evidenceStatusTag"),
      evidenceSummaryText: document.getElementById("evidenceSummaryText"),
      evidenceActionBtn: document.getElementById("evidenceActionBtn"),
      currentDeliverables: document.getElementById("currentDeliverables"),
      currentQuestions: document.getElementById("currentQuestions"),
      currentJavaMapping: document.getElementById("currentJavaMapping"),
      currentAcceptance: document.getElementById("currentAcceptance"),
      nextTaskText: document.getElementById("nextTaskText"),
      todayProgressText: document.getElementById("todayProgressText"),
      todayRiskText: document.getElementById("todayRiskText"),
      todayInterviewText: document.getElementById("todayInterviewText"),
      startTodayInterviewBtn: document.getElementById("startTodayInterviewBtn"),
      primaryFilters: document.getElementById("primaryFilters"),
      engineeringFilters: document.getElementById("engineeringFilters"),
      planSettingsForm: document.getElementById("planSettingsForm"),
      startTodayBtn: document.getElementById("startTodayBtn"),
      resetPlanSettingsBtn: document.getElementById("resetPlanSettingsBtn"),
      searchInput: document.getElementById("searchInput"),
      unfinishedOnly: document.getElementById("unfinishedOnly"),
      selectTodayBtn: document.getElementById("selectTodayBtn"),
      todayTitle: document.getElementById("todayTitle"),
      todaySummary: document.getElementById("todaySummary"),
      timeline: document.getElementById("timeline"),
      overview: document.getElementById("overview"),
      detailTitle: document.getElementById("detailTitle"),
      detailPanel: document.getElementById("detailPanel"),
      reviewTitle: document.getElementById("reviewTitle"),
      reviewForm: document.getElementById("reviewForm"),
      saveReviewBtn: document.getElementById("saveReviewBtn"),
      exportCompletionBtn: document.getElementById("exportCompletionBtn"),
      exportReviewsBtn: document.getElementById("exportReviewsBtn"),
      exportWrongQuestionsBtn: document.getElementById("exportWrongQuestionsBtn"),
      exportPathAuditBtn: document.getElementById("exportPathAuditBtn"),
      pathSummary: document.getElementById("pathSummary"),
      pathCards: document.getElementById("pathCards"),
      applicationForm: document.getElementById("applicationForm"),
      applicationRows: document.getElementById("applicationRows"),
      applicationCards: document.getElementById("applicationCards"),
      exportApplicationsBtn: document.getElementById("exportApplicationsBtn"),
      kbSearchInput: document.getElementById("kbSearchInput"),
      kbCategoryFilter: document.getElementById("kbCategoryFilter"),
      kbCategoryChips: document.getElementById("kbCategoryChips"),
      kbFavoritesOnly: document.getElementById("kbFavoritesOnly"),
      kbMistakesOnly: document.getElementById("kbMistakesOnly"),
      kbEntries: document.getElementById("kbEntries"),
      generateKbBtn: document.getElementById("generateKbBtn"),
      kbGenerateForm: document.getElementById("kbGenerateForm"),
      kbGenerateTopicInput: document.getElementById("kbGenerateTopicInput"),
      kbGenerateStatus: document.getElementById("kbGenerateStatus"),
      randomKbQuestionBtn: document.getElementById("randomKbQuestionBtn"),
      questionMode: document.getElementById("questionMode"),
      nextQuestionBtn: document.getElementById("nextQuestionBtn"),
      questionSource: document.getElementById("questionSource"),
      questionText: document.getElementById("questionText"),
      questionHint: document.getElementById("questionHint"),
      answerText: document.getElementById("answerText"),
      voiceStartBtn: document.getElementById("voiceStartBtn"),
      voiceStopBtn: document.getElementById("voiceStopBtn"),
      voiceStatus: document.getElementById("voiceStatus"),
      scoreAnswerBtn: document.getElementById("scoreAnswerBtn"),
      scoreResult: document.getElementById("scoreResult"),
      mistakeList: document.getElementById("mistakeList"),
      practiceLatestMistakeBtn: document.getElementById("practiceLatestMistakeBtn"),
      sessionRows: document.getElementById("sessionRows"),
      delayForm: document.getElementById("delayForm"),
      delayRows: document.getElementById("delayRows"),
      delayImpactSummary: document.getElementById("delayImpactSummary"),
      openRecoveryTaskBtn: document.getElementById("openRecoveryTaskBtn"),
      exportDelaysBtn: document.getElementById("exportDelaysBtn"),
      sheetBackdrop: document.getElementById("sheetBackdrop"),
      taskDetailSheet: document.getElementById("taskDetailSheet"),
      taskDetailSheetMeta: document.getElementById("taskDetailSheetMeta"),
      taskDetailSheetTitle: document.getElementById("taskDetailSheetTitle"),
      taskDetailSheetBody: document.getElementById("taskDetailSheetBody"),
      taskDetailCloseBtn: document.getElementById("taskDetailCloseBtn"),
      taskDetailCompleteBtn: document.getElementById("taskDetailCompleteBtn"),
      kbDetailSheet: document.getElementById("kbDetailSheet"),
      kbDetailMeta: document.getElementById("kbDetailMeta"),
      kbDetailTitle: document.getElementById("kbDetailTitle"),
      kbDetailBody: document.getElementById("kbDetailBody"),
      kbDetailCloseBtn: document.getElementById("kbDetailCloseBtn"),
      kbPracticeBtn: document.getElementById("kbPracticeBtn"),
      kbCopyAnswerBtn: document.getElementById("kbCopyAnswerBtn"),
      kbFavoriteBtn: document.getElementById("kbFavoriteBtn"),
      kbMistakeBtn: document.getElementById("kbMistakeBtn")
    };

    const app = {
      schedule: null,
      effectiveSchedule: null,
      interviewContext: null,
      interviewKb: null,
      storageMode: "localStorage fallback",
      authState: null,
      activeQuestion: null,
      activeKbEntryId: null,
      activeKbDetailId: null,
      activeSheet: null,
      questionCursor: 0,
      recognition: null,
      selectedDate: null,
      selectedBlockId: null,
      lastReviewDate: null,
      intervalId: null,
      activeView: window.localStorage.getItem(APP_VIEW_KEY) || "today",
      filters: {
        category: "all",
        query: "",
        kbQuery: "",
        kbCategory: "all",
        kbFavoritesOnly: false,
        kbMistakesOnly: false,
        unfinishedOnly: false
      },
      planSettings: readPlanSettings()
    };
    window.__JOB_SPRINT_APP__ = app;

    function readEmbeddedData(key) {
      const embedded = window.__JOB_SPRINT_EMBEDDED_DATA__;
      if (!embedded || typeof embedded !== "object" || !Object.prototype.hasOwnProperty.call(embedded, key)) {
        return undefined;
      }
      return embedded[key];
    }

    async function loadJsonData(path, key, options = {}) {
      try {
        const response = await fetch(path, { cache: "no-store" });
        if (!response.ok) throw new Error(`${key} HTTP ${response.status}`);
        return response.json();
      } catch (error) {
        const embedded = readEmbeddedData(key);
        if (embedded !== undefined) {
          return embedded;
        }
        if (options.optional) {
          return null;
        }
        throw error;
      }
    }

    Promise.all([
      loadJsonData("data/schedule.json", "schedule"),
      loadJsonData("data/interview_context.json", "interviewContext", { optional: true }),
      loadJsonData("data/interview_kb.json", "interviewKb", { optional: true })
    ])
      .then(async ([schedule, interviewContext, interviewKb]) => {
        app.schedule = schedule;
        app.interviewContext = interviewContext || { questionBank: [] };
        app.interviewKb = interviewKb || { entries: [] };
        app.interviewContext.questionBank = mergeQuestionBank(app.interviewContext.questionBank || [], app.interviewKb.entries || []);
        await setupControls(app, els);
        await loadServerRuntimeState(app);
        const baseSchedule = getScheduleForSettings(schedule, app.planSettings);
        app.effectiveSchedule = applyPlanDelays(baseSchedule, readJsonStorage(DELAYS_KEY, []), readJsonStorage(COMPLETED_KEY, {}));
        const state = getPlanState(app.effectiveSchedule, getEffectiveNow(app.effectiveSchedule, app.planSettings));
        app.selectedDate = state.today ? state.today.date : schedule.startDate;
        const active = state.current || state.next;
        app.selectedBlockId = active ? active.id : schedule.days[0].blocks[0].id;
        renderAll(app, els);
        app.intervalId = window.setInterval(() => renderAll(app, els), 30000);
      })
      .catch((error) => {
        document.querySelector(".app-shell").innerHTML = `
          <section class="load-error">
            <h2>无法加载 data/schedule.json</h2>
            <p>如果你是直接双击打开 HTML，浏览器可能限制本地 JSON 读取。请在当前目录运行：</p>
            <pre>python3 -m http.server 8000</pre>
            <p>然后访问 http://localhost:8000/schedule.html。</p>
            <p>错误信息：${error.message}</p>
          </section>
        `;
      });
  }

  function createFilterButton(label, action, active = false) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    if (active) button.classList.add("active");
    button.addEventListener("click", action);
    return button;
  }

  function renderFilterControls(app, els) {
    if (els.primaryFilters) {
      els.primaryFilters.innerHTML = "";
      els.primaryFilters.appendChild(createFilterButton("全部", () => {
        resetTaskFilters(app, els);
      }, app.filters.category === "all" && !app.filters.unfinishedOnly));
      categoriesByGroup("primary")
        .filter(([, meta]) => meta.showInMainFilter)
        .forEach(([category, meta]) => {
          els.primaryFilters.appendChild(createFilterButton(meta.label, () => {
            app.filters.category = category;
            app.filters.unfinishedOnly = false;
            els.unfinishedOnly.checked = false;
            renderAll(app, els);
          }, app.filters.category === category));
        });
      els.primaryFilters.appendChild(createFilterButton("今日未完成", () => {
        app.filters.category = "all";
        app.filters.unfinishedOnly = true;
        els.unfinishedOnly.checked = true;
        renderAll(app, els);
      }, app.filters.unfinishedOnly));
    }

    if (els.engineeringFilters) {
      els.engineeringFilters.innerHTML = "";
      ["deployment", "android", "path-missing"].forEach((category) => {
        const meta = CATEGORY_META[category];
        els.engineeringFilters.appendChild(createFilterButton(meta.label, () => {
          app.filters.category = category;
          app.filters.unfinishedOnly = false;
          els.unfinishedOnly.checked = false;
          setActiveView(app, els, "schedule");
          renderAll(app, els);
        }, app.filters.category === category));
      });
      ["path-audit", "public-safe", "health-check"].forEach((category) => {
        const meta = CATEGORY_META[category];
        const chip = document.createElement("span");
        chip.className = "tool-chip";
        chip.textContent = meta.label;
        els.engineeringFilters.appendChild(chip);
      });
    }
  }

  function resetTaskFilters(app, els) {
    app.filters.category = "all";
    app.filters.query = "";
    app.filters.kbQuery = "";
    app.filters.kbCategory = "all";
    app.filters.unfinishedOnly = false;
    els.searchInput.value = "";
    if (els.kbSearchInput) els.kbSearchInput.value = "";
    if (els.kbCategoryFilter) els.kbCategoryFilter.value = "all";
    els.unfinishedOnly.checked = false;
    renderAll(app, els);
  }

  function populatePlanSettings(app, els) {
    const form = els.planSettingsForm;
    if (!form) return;
    const settings = app.planSettings || readPlanSettings();
    form.elements.mode.value = settings.mode;
    form.elements.actualStartDate.value = settings.actualStartDate || "";
    const simulateDay = form.elements.simulateDay;
    simulateDay.innerHTML = "";
    (app.schedule.days || []).forEach((day, index) => {
      const option = document.createElement("option");
      option.value = String(index + 1);
      option.textContent = `Day ${index + 1} · ${day.theme}`;
      simulateDay.appendChild(option);
    });
    simulateDay.value = String(settings.simulateDay || 1);
  }

  function startPlanToday(app, els) {
    app.planSettings = {
      mode: "custom-start",
      actualStartDate: formatSgDate(new Date()),
      simulateDay: "1"
    };
    savePlanSettings(app.planSettings);
    populatePlanSettings(app, els);
    renderAll(app, els);
  }

  function openReviewForEvidence(app, els, block) {
    if (block && block.day) {
      app.selectedDate = block.day.date;
      app.lastReviewDate = null;
    }
    setActiveView(app, els, "review");
    renderAll(app, els);
    const firstField = els.reviewForm && els.reviewForm.elements.projectPoint;
    if (firstField && firstField.focus) {
      firstField.focus();
    }
  }

  function openPlanSettings(app, els) {
    setActiveView(app, els, "settings");
    if (els.startTodayBtn && els.startTodayBtn.focus) {
      els.startTodayBtn.focus();
    }
  }

  function focusAnswerBox(els) {
    if (els.answerText && els.answerText.focus) {
      els.answerText.focus();
    }
  }

  function setupAndroidSettingsControls(els) {
    const remoteBridge = androidRemoteSettingsBridge();
    const authBridge = androidAuthSettingsBridge();
    const sessionBridge = androidSessionCookieBridge();
    if (!remoteBridge) {
      renderAndroidSettings(els);
      return;
    }
    if (els.androidSettingsForm) {
      els.androidSettingsForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const value = els.androidRemoteUrlInput ? els.androidRemoteUrlInput.value : "";
        let saved = false;
        try {
          saved = typeof remoteBridge.setRemoteUrl === "function" && Boolean(remoteBridge.setRemoteUrl(value));
        } catch (_) {
          saved = false;
        }
        if (els.androidSettingsStatus) {
          els.androidSettingsStatus.textContent = saved
            ? "HTTPS 服务地址已保存到 App 私有设置。"
            : "保存失败：必须填写 https:// 且包含 /job-sprint/ 的地址。";
        }
        renderAndroidSettings(els);
      });
    }
    if (els.reloadAndroidRemoteBtn) {
      els.reloadAndroidRemoteBtn.addEventListener("click", () => {
        if (typeof remoteBridge.reloadRemote === "function") remoteBridge.reloadRemote();
      });
    }
    if (els.useAndroidFallbackBtn) {
      els.useAndroidFallbackBtn.addEventListener("click", () => {
        if (typeof remoteBridge.loadFallback === "function") remoteBridge.loadFallback();
      });
    }
    if (els.clearAndroidAuthBtn) {
      els.clearAndroidAuthBtn.addEventListener("click", () => {
        if (authBridge && typeof authBridge.clearBasicAuth === "function") authBridge.clearBasicAuth();
        renderAndroidSettings(els);
      });
    }
    if (els.clearAndroidSessionBtn) {
      els.clearAndroidSessionBtn.addEventListener("click", () => {
        if (sessionBridge && typeof sessionBridge.clearSessionCookie === "function") sessionBridge.clearSessionCookie();
        renderAndroidSettings(els);
      });
    }
    if (els.reopenAndroidLoginBtn) {
      els.reopenAndroidLoginBtn.addEventListener("click", () => {
        if (sessionBridge && typeof sessionBridge.clearSessionAndOpenLogin === "function") {
          sessionBridge.clearSessionAndOpenLogin();
        }
      });
    }
    renderAndroidSettings(els);
  }

  function readStringSet(key) {
    return new Set(readJsonStorage(key, []));
  }

  function writeStringSet(key, values) {
    writeJsonStorage(key, Array.from(values));
  }

  function sheetIsOpen(els) {
    return Boolean(
      (els.taskDetailSheet && !els.taskDetailSheet.hidden)
      || (els.kbDetailSheet && !els.kbDetailSheet.hidden)
    );
  }

  function openSheet(app, els, sheetName) {
    app.activeSheet = sheetName;
    if (els.sheetBackdrop) {
      els.sheetBackdrop.hidden = false;
      els.sheetBackdrop.classList.add("is-open");
    }
    [els.taskDetailSheet, els.kbDetailSheet].forEach((sheet) => {
      if (!sheet) return;
      const active = sheet.dataset.sheet === sheetName || sheet.id === `${sheetName}Sheet`;
      sheet.hidden = !active;
      sheet.classList.toggle("is-open", active);
      if (active && sheet.focus) {
        window.setTimeout(() => sheet.focus(), 0);
      }
    });
    document.body.classList.add("sheet-lock");
    if (window.history && !window.history.state?.jobSprintSheet) {
      window.history.pushState({ jobSprintSheet: sheetName }, "", window.location.href);
    }
  }

  function closeSheets(app, els, options = {}) {
    app.activeSheet = null;
    if (els.sheetBackdrop) {
      els.sheetBackdrop.classList.remove("is-open");
      els.sheetBackdrop.hidden = true;
    }
    [els.taskDetailSheet, els.kbDetailSheet].forEach((sheet) => {
      if (!sheet) return;
      sheet.classList.remove("is-open");
      sheet.hidden = true;
    });
    document.body.classList.remove("sheet-lock");
    if (!options.fromPopState && window.history && window.history.state?.jobSprintSheet) {
      window.history.back();
    }
  }

  function setupSheetControls(app, els) {
    if (els.taskDetailSheet) els.taskDetailSheet.dataset.sheet = "taskDetail";
    if (els.kbDetailSheet) els.kbDetailSheet.dataset.sheet = "kbDetail";
    if (els.sheetBackdrop) {
      els.sheetBackdrop.addEventListener("click", () => closeSheets(app, els));
    }
    if (els.taskDetailCloseBtn) {
      els.taskDetailCloseBtn.addEventListener("click", () => closeSheets(app, els));
    }
    if (els.kbDetailCloseBtn) {
      els.kbDetailCloseBtn.addEventListener("click", () => closeSheets(app, els));
    }
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && sheetIsOpen(els)) {
        closeSheets(app, els);
      }
    });
    window.addEventListener("popstate", () => {
      if (sheetIsOpen(els)) {
        closeSheets(app, els, { fromPopState: true });
      }
    });
  }

  function openInterviewPractice(app, els, question) {
    if (question) {
      app.activeQuestion = question;
      if (els.answerText) {
        els.answerText.value = "";
      }
    } else {
      selectInterviewQuestion(app, els, false);
    }
    setActiveView(app, els, "interview");
    renderInterview(app, els, getPlanState(app.effectiveSchedule || app.schedule, getEffectiveNow(app.effectiveSchedule || app.schedule, app.planSettings, new Date())));
    focusAnswerBox(els);
  }

  function questionFromMistake(record) {
    if (!record) return null;
    return {
      id: `mistake-${record.id}`,
      mode: "mistake-review",
      source: `错题重练 · ${record.score || "--"} 分`,
      question: record.question,
      hint: record.followUp || "先补业务背景、链路、异常分支、Java 映射和证据。",
      expectedKeywords: []
    };
  }

  function setupControls(app, els) {
    setupNavigation(app, els);
    const authPromise = setupAuthControls(app, els);
    setupSheetControls(app, els);
    renderFilterControls(app, els);
    populatePlanSettings(app, els);
    setupAndroidSettingsControls(els);

    els.searchInput.addEventListener("input", () => {
      app.filters.query = els.searchInput.value;
      renderAll(app, els);
    });

    els.unfinishedOnly.addEventListener("change", () => {
      app.filters.unfinishedOnly = els.unfinishedOnly.checked;
      renderAll(app, els);
    });

    if (els.planSettingsForm) {
      els.planSettingsForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const form = els.planSettingsForm.elements;
        app.planSettings = {
          mode: form.mode.value,
          actualStartDate: form.actualStartDate.value,
          simulateDay: form.simulateDay.value || "1"
        };
        savePlanSettings(app.planSettings);
        renderAll(app, els);
      });
    }

    if (els.startTodayBtn) {
      els.startTodayBtn.addEventListener("click", () => {
        startPlanToday(app, els);
      });
    }

    if (els.resetPlanSettingsBtn) {
      els.resetPlanSettingsBtn.addEventListener("click", () => {
        app.planSettings = { mode: "real", actualStartDate: "", simulateDay: "1" };
        savePlanSettings(app.planSettings);
        populatePlanSettings(app, els);
        renderAll(app, els);
      });
    }

    els.selectTodayBtn.addEventListener("click", () => {
      const schedule = app.effectiveSchedule || app.schedule;
      const now = getEffectiveNow(schedule, app.planSettings, new Date());
      const state = getPlanState(schedule, now);
      app.selectedDate = state.today ? state.today.date : state.zoneDate;
      const active = state.current || state.next;
      if (active) app.selectedBlockId = active.id;
      app.lastReviewDate = null;
      renderAll(app, els);
    });

    if (els.startTodayInterviewBtn) {
      els.startTodayInterviewBtn.addEventListener("click", () => {
        openInterviewPractice(app, els, null);
      });
    }

    els.completeCurrentBtn.addEventListener("click", () => {
      if (isReadOnly(app)) {
        window.alert("访客只读模式不能修改任务完成状态。");
        return;
      }
      const schedule = app.effectiveSchedule || app.schedule;
      const state = getPlanState(schedule, getEffectiveNow(schedule, app.planSettings, new Date()));
      if (state.code === "before") {
        startPlanToday(app, els);
        return;
      }
      const target = state.current || state.next || findBlockById(schedule, app.selectedBlockId);
      if (!target) return;
      const completed = readJsonStorage(COMPLETED_KEY, {});
      if (!completed[target.id] && !hasCompletionEvidence(app, target)) {
        window.alert("先补一条证据再标记完成：每日复盘、口述评分或机会反馈证据至少要有一项。");
        return;
      }
      completed[target.id] = !completed[target.id];
      writeJsonStorage(COMPLETED_KEY, completed);
      syncProgress(completed);
      renderAll(app, els);
    });

    if (els.evidenceActionBtn) {
      els.evidenceActionBtn.addEventListener("click", () => {
        const schedule = app.effectiveSchedule || app.schedule;
        const state = getPlanState(schedule, getEffectiveNow(schedule, app.planSettings, new Date()));
        const target = state.current || state.next || findBlockById(schedule, app.selectedBlockId);
        if (state.code === "before") {
          openPlanSettings(app, els);
          return;
        }
        openReviewForEvidence(app, els, target);
      });
    }

    els.saveReviewBtn.addEventListener("click", () => {
      saveCurrentReview(app, els);
    });

    els.reviewForm.addEventListener("input", () => {
      window.clearTimeout(app.reviewSaveTimer);
      app.reviewSaveTimer = window.setTimeout(() => saveCurrentReview(app, els), 500);
    });

    els.exportCompletionBtn.addEventListener("click", () => {
      downloadJson("schedule-completion.json", readJsonStorage(COMPLETED_KEY, {}));
    });

    els.exportReviewsBtn.addEventListener("click", () => {
      downloadJson("schedule-reviews.json", readJsonStorage(REVIEWS_KEY, {}));
    });

    els.exportWrongQuestionsBtn.addEventListener("click", () => {
      const sessions = readJsonStorage(INTERVIEW_SESSIONS_KEY, []);
      const mistakes = readJsonStorage(INTERVIEW_MISTAKES_KEY, []);
      downloadJson("interview-wrong-questions.json", mistakes.length ? mistakes : sessions.filter((item) => Number(item.score || 0) < 75));
    });

    els.exportPathAuditBtn.addEventListener("click", () => {
      downloadJson("schedule-path-audit.json", buildPathAudit(app.effectiveSchedule || app.schedule));
    });

    els.exportApplicationsBtn.addEventListener("click", () => {
      downloadJson("schedule-applications.json", readJsonStorage(APPLICATIONS_KEY, []));
    });

    if (els.kbCategoryFilter && app.interviewKb) {
      populateKbCategoryOptions(app, els);
      els.kbCategoryFilter.addEventListener("change", () => {
        app.filters.kbCategory = els.kbCategoryFilter.value;
        renderKbCategoryChips(app, els);
        renderKnowledgeBase(app, els);
      });
      renderKbCategoryChips(app, els);
    }

    if (els.generateKbBtn) {
      els.generateKbBtn.addEventListener("click", () => {
        setActiveView(app, els, "knowledge");
        if (els.kbGenerateTopicInput) {
          const currentTask = currentTaskPayload(app);
          if (!els.kbGenerateTopicInput.value.trim() && currentTask) {
            els.kbGenerateTopicInput.value = currentTask.title || "";
          }
          els.kbGenerateTopicInput.focus();
        }
      });
    }

    if (els.kbGenerateForm) {
      els.kbGenerateForm.addEventListener("submit", (event) => {
        event.preventDefault();
        generateKnowledgeEntries(app, els);
      });
    }

    if (els.kbSearchInput) {
      els.kbSearchInput.addEventListener("input", () => {
        app.filters.kbQuery = els.kbSearchInput.value;
        renderKnowledgeBase(app, els);
      });
    }

    if (els.kbFavoritesOnly) {
      els.kbFavoritesOnly.addEventListener("change", () => {
        app.filters.kbFavoritesOnly = els.kbFavoritesOnly.checked;
        renderKnowledgeBase(app, els);
      });
    }

    if (els.kbMistakesOnly) {
      els.kbMistakesOnly.addEventListener("change", () => {
        app.filters.kbMistakesOnly = els.kbMistakesOnly.checked;
        renderKnowledgeBase(app, els);
      });
    }

    if (els.randomKbQuestionBtn) {
      els.randomKbQuestionBtn.addEventListener("click", () => {
        const entries = filteredKbEntries(app);
        if (entries.length === 0) return;
        const entry = entries[Math.floor(Math.random() * entries.length)];
        startKbPractice(app, els, entry, "kb-random");
      });
    }

    if (els.kbPracticeBtn) {
      els.kbPracticeBtn.addEventListener("click", () => {
        const entry = findKbEntryById(app, app.activeKbDetailId);
        if (entry) {
          startKbPractice(app, els, entry, "kb-detail");
          closeSheets(app, els);
        }
      });
    }

    if (els.kbCopyAnswerBtn) {
      els.kbCopyAnswerBtn.addEventListener("click", () => {
        const entry = findKbEntryById(app, app.activeKbDetailId);
        if (entry) {
          copyText(entry.answer60s || entry.publicSummary || entry.title || "");
          els.kbCopyAnswerBtn.textContent = "已复制";
          window.setTimeout(() => { els.kbCopyAnswerBtn.textContent = "复制 60 秒回答"; }, 1200);
        }
      });
    }

    if (els.kbFavoriteBtn) {
      els.kbFavoriteBtn.addEventListener("click", () => {
        toggleKbCollection(KB_FAVORITES_KEY, app.activeKbDetailId);
        renderKbDetailSheet(app, els, findKbEntryById(app, app.activeKbDetailId));
        renderKnowledgeBase(app, els);
      });
    }

    if (els.kbMistakeBtn) {
      els.kbMistakeBtn.addEventListener("click", () => {
        toggleKbCollection(KB_MANUAL_MISTAKES_KEY, app.activeKbDetailId);
        renderKbDetailSheet(app, els, findKbEntryById(app, app.activeKbDetailId));
        renderKnowledgeBase(app, els);
      });
    }

    els.applicationForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (isReadOnly(app)) {
        window.alert("访客只读模式不能新增机会记录。");
        return;
      }
      const formData = new FormData(els.applicationForm);
      const records = readJsonStorage(APPLICATIONS_KEY, []);
      const record = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        date: formData.get("date") || app.selectedDate,
        company: formData.get("company") || "",
        role: formData.get("role") || "",
        city: formData.get("city") || "",
        keywords: formData.get("keywords") || "",
        tags: formData.getAll("tags"),
        resumeVersion: formData.get("resumeVersion") || "",
        status: normalizeApplicationStatus(formData.get("status")),
        notes: formData.get("notes") || ""
      };
      records.push(record);
      writeJsonStorage(APPLICATIONS_KEY, records);
      syncApplicationCreate(record);
      els.applicationForm.reset();
      els.applicationForm.elements.date.value = app.selectedDate;
      renderApplications(els);
    });

    els.applicationForm.elements.date.value = app.selectedDate || app.schedule.startDate;

    els.nextQuestionBtn.addEventListener("click", () => {
      selectInterviewQuestion(app, els, true);
      renderInterview(app, els, getPlanState(app.effectiveSchedule || app.schedule, getEffectiveNow(app.effectiveSchedule || app.schedule, app.planSettings, new Date())));
    });

    els.questionMode.addEventListener("change", () => {
      app.activeQuestion = null;
      selectInterviewQuestion(app, els, true);
      renderInterview(app, els, getPlanState(app.effectiveSchedule || app.schedule, getEffectiveNow(app.effectiveSchedule || app.schedule, app.planSettings, new Date())));
    });

    els.scoreAnswerBtn.addEventListener("click", () => {
      scoreCurrentAnswer(app, els);
    });

    if (els.practiceLatestMistakeBtn) {
      els.practiceLatestMistakeBtn.addEventListener("click", () => {
        const latest = readJsonStorage(INTERVIEW_MISTAKES_KEY, [])[0];
        if (!latest) {
          focusAnswerBox(els);
          return;
        }
        openInterviewPractice(app, els, questionFromMistake(latest));
      });
    }

    setupSpeechRecognition(app, els);

    els.delayForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (isReadOnly(app)) {
        window.alert("访客只读模式不能登记延期事件。");
        return;
      }
      const form = els.delayForm.elements;
      const start = `${form.startDate.value}T${form.startTime.value || "09:30"}:00${FIXED_OFFSET}`;
      const end = `${form.endDate.value}T${form.endTime.value || "18:00"}:00${FIXED_OFFSET}`;
      const startDate = new Date(start);
      const endDate = new Date(end);
      if (!form.startDate.value || !form.endDate.value || endDate <= startDate) {
        window.alert("请填写有效的开始和结束时间。");
        return;
      }
      const records = readJsonStorage(DELAYS_KEY, []);
      records.push({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        start,
        end,
        minutes: Math.round((endDate - startDate) / 60000),
        reason: form.reason.value || "突发事件",
        createdAt: new Date().toISOString()
      });
      writeJsonStorage(DELAYS_KEY, records);
      renderAll(app, els);
      const summary = delayRecoverySummary(app, records);
      if (summary.nextDelayed) {
        app.selectedDate = summary.nextDelayed.day.date;
        app.selectedBlockId = summary.nextDelayed.id;
        setActiveView(app, els, "schedule");
        renderAll(app, els);
      }
    });

    els.exportDelaysBtn.addEventListener("click", () => {
      downloadJson("schedule-delays.json", readJsonStorage(DELAYS_KEY, []));
    });

    if (els.openRecoveryTaskBtn) {
      els.openRecoveryTaskBtn.addEventListener("click", () => {
        openNextRecoveryTask(app, els);
      });
    }

    if (els.delayForm.elements.startDate) {
      els.delayForm.elements.startDate.value = app.selectedDate || app.schedule.startDate;
      els.delayForm.elements.endDate.value = app.selectedDate || app.schedule.startDate;
    }
    return authPromise;
  }

  function setupAuthControls(app, els) {
    if (els.logoutBtn) {
      els.logoutBtn.hidden = true;
      els.logoutBtn.addEventListener("click", async () => {
        els.logoutBtn.disabled = true;
        try {
          await apiJson("/api/auth/logout", { method: "POST", body: {} });
        } catch (_) {
          // Even if the server is unavailable, move the user back to the login surface.
        }
        window.location.href = resolveAppPath("/login.html");
      });
    }

    if (!els.authStatusText) {
      return Promise.resolve(null);
    }

    return apiJson("/api/auth/session")
      .then((session) => {
        app.authState = session;
        if (session.authDisabled) {
          els.authStatusText.textContent = "本地免登录";
        } else if (session.authenticated) {
          const user = session.user || {};
          els.authStatusText.textContent = `${user.displayName || user.username || "已登录"} · ${user.role || "user"}`;
          if (els.logoutBtn) els.logoutBtn.hidden = false;
        } else if (!session.authConfigured) {
          els.authStatusText.textContent = "认证未配置";
        } else {
          els.authStatusText.textContent = "未登录";
        }
        if (!viewAllowed(app, app.activeView || "today")) {
          app.activeView = firstAllowedView(app);
        }
        renderWorkspaceChrome(app, els);
        renderAll(app, els);
      })
      .catch(() => {
        els.authStatusText.textContent = "本地离线";
        if (els.logoutBtn) els.logoutBtn.hidden = true;
        return null;
      });
  }

  function renderAll(app, els) {
    if (!app.schedule) return;
    app.planSettings = app.planSettings || readPlanSettings();
    const completed = readJsonStorage(COMPLETED_KEY, {});
    const baseSchedule = getScheduleForSettings(app.schedule, app.planSettings);
    app.effectiveSchedule = applyPlanDelays(baseSchedule, readJsonStorage(DELAYS_KEY, []), completed);
    const schedule = app.effectiveSchedule;
    const now = getEffectiveNow(schedule, app.planSettings, new Date());
    const state = getPlanState(schedule, now);
    if (!app.selectedDate) {
      app.selectedDate = state.today ? state.today.date : schedule.startDate;
    }
    if (!findBlockById(schedule, app.selectedBlockId)) {
      const active = state.current || state.next;
      app.selectedBlockId = active ? active.id : schedule.days[0].blocks[0].id;
    }

    renderFilterControls(app, els);
    renderStatus(app, els, state, now);
    renderCurrentCard(app, els, state, now);
    renderSelectedDay(app, els, state, now);
    renderOverview(app, els, state, now);
    renderDetail(app, els, state);
    renderPathCards(app, els, state);
    renderReview(app, els);
    renderApplications(els);
    renderDelays(app, els);
    renderInterview(app, els, state);
    renderKnowledgeBase(app, els);
  }

  function reviewHasContent(review) {
    return Object.entries(review || {}).some(([key, value]) => {
      return key !== "updatedAt" && String(value || "").trim().length > 0;
    });
  }

  function sessionDate(record) {
    if (!record || !record.createdAt) return "";
    const date = new Date(record.createdAt);
    if (!Number.isFinite(date.getTime())) return "";
    return formatSgDate(date);
  }

  function completionEvidenceDetails(app, block) {
    const date = block && block.day ? block.day.date : app.selectedDate;
    const review = readJsonStorage(REVIEWS_KEY, {})[date] || {};
    const sessions = readJsonStorage(INTERVIEW_SESSIONS_KEY, []);
    const applications = readJsonStorage(APPLICATIONS_KEY, []);
    const sameDaySessions = sessions.filter((record) => sessionDate(record) === date);
    const sameDayApplications = applications.filter((item) => item.date === date);
    const evidence = [];

    if (reviewHasContent(review)) {
      evidence.push("复盘已写");
    }
    if (sameDaySessions.length > 0) {
      evidence.push(`口述评分 ${sameDaySessions.length} 条`);
    } else if (sessions.length > 0) {
      evidence.push("已有口述评分");
    }
    if (sameDayApplications.length > 0) {
      evidence.push(`机会记录 ${sameDayApplications.length} 条`);
    }

    return {
      date,
      hasEvidence: evidence.length > 0,
      evidence,
      summary: evidence.length
        ? `已沉淀：${evidence.join("、")}。`
        : "待沉淀：完成前请补一条每日复盘、口述评分或当日机会反馈。"
    };
  }

  function todayActionMetrics(app, day) {
    const completed = readJsonStorage(COMPLETED_KEY, {});
    const blocks = day ? day.blocks : [];
    const doneCount = blocks.filter((block) => completed[block.id]).length;
    const pendingCount = Math.max(0, blocks.length - doneCount);
    const reviews = readJsonStorage(REVIEWS_KEY, {});
    const sessions = readJsonStorage(INTERVIEW_SESSIONS_KEY, []);
    const delays = readJsonStorage(DELAYS_KEY, []);
    const hasReview = reviewHasContent(reviews[day ? day.date : app.selectedDate] || {});
    const hasInterview = day
      ? sessions.some((record) => sessionDate(record) === day.date)
      : sessions.length > 0;

    return {
      doneCount,
      pendingCount,
      hasReview,
      hasInterview,
      delayCount: Array.isArray(delays) ? delays.length : 0
    };
  }

  function renderStatus(app, els, state, now) {
    const schedule = app.effectiveSchedule || app.schedule;
    const selectedOrToday = state.today || getDayByDate(schedule, app.selectedDate);
    const dayNumber = selectedOrToday
      ? schedule.days.findIndex((day) => day.date === selectedOrToday.date) + 1
      : 0;
    const metrics = todayActionMetrics(app, selectedOrToday);
    const evidence = completionEvidenceDetails(app, state.current || state.next || findBlockById(schedule, app.selectedBlockId));

    els.nowText.textContent = formatNowInZone(now, schedule.timezone || "Asia/Singapore");
    els.dayText.textContent = dayNumber ? `Day ${dayNumber} / ${schedule.days.length}` : "--";
    els.stateText.textContent = state.code === "before"
      ? "先启动计划"
      : state.current
        ? "当前任务进行中"
        : state.next
          ? "等待下一任务"
          : state.status;
    els.progressText.textContent = `待完成 ${metrics.pendingCount} 个`;
    els.storageText.textContent = evidence.hasEvidence ? "已沉淀" : "待沉淀";
    if (els.todayProgressText) {
      els.todayProgressText.textContent = [
        `待完成 ${metrics.pendingCount} 个`,
        metrics.hasInterview ? "口述已完成" : "待口述 1 题",
        metrics.hasReview ? "已复盘" : "待复盘",
        metrics.delayCount ? `延期 ${metrics.delayCount} 次` : "无延期"
      ].join(" · ");
    }
    if (els.todayRiskText) {
      els.todayRiskText.textContent = selectedOrToday ? (selectedOrToday.risk || "按当日验收标准推进") : "--";
    }
    if (els.planModeText) {
      els.planModeText.textContent = planModeLabel(app.planSettings || readPlanSettings());
    }
    renderWorkspaceChrome(app, els);
  }

  function renderCompletionEvidence(app, els, block, state) {
    if (!els.evidenceStatusTag || !els.evidenceSummaryText || !els.evidenceActionBtn) return;

    if (!block) {
      els.evidenceStatusTag.className = "tag tag-muted";
      els.evidenceStatusTag.textContent = "无任务";
      els.evidenceSummaryText.textContent = "当前没有需要沉淀的任务证据。";
      els.evidenceActionBtn.disabled = true;
      els.evidenceActionBtn.textContent = "无需处理";
      return;
    }

    if (state && state.code === "before") {
      els.evidenceStatusTag.className = "tag tag-muted";
      els.evidenceStatusTag.textContent = "计划未开始";
      els.evidenceSummaryText.textContent = "先从今天开始 Day1，再沉淀复盘、口述评分或机会反馈证据。";
      els.evidenceActionBtn.disabled = false;
      els.evidenceActionBtn.textContent = "查看计划设置";
      return;
    }

    const evidence = completionEvidenceDetails(app, block);
    els.evidenceStatusTag.className = evidence.hasEvidence ? "tag tag-review" : "tag tag-muted";
    els.evidenceStatusTag.textContent = evidence.hasEvidence ? "已沉淀" : "待沉淀";
    els.evidenceSummaryText.textContent = evidence.summary;
    els.evidenceActionBtn.disabled = false;
    els.evidenceActionBtn.textContent = evidence.hasEvidence ? "查看复盘证据" : "去复盘补证据";
  }

  function renderTodayInterviewEntry(app, els, state) {
    if (!els.todayInterviewText) return;
    const question = app.activeQuestion || selectInterviewQuestion(app, els, false);
    if (!question) {
      els.todayInterviewText.textContent = "题库未加载，先检查面试上下文。";
      if (els.startTodayInterviewBtn) {
        els.startTodayInterviewBtn.disabled = true;
      }
      return;
    }
    const current = state && (state.current || state.next);
    els.todayInterviewText.textContent = current
      ? `${question.question}`
      : "用简历项目深挖题先练一版 60 秒回答。";
    if (els.startTodayInterviewBtn) {
      els.startTodayInterviewBtn.disabled = false;
    }
  }

  function renderCurrentCard(app, els, state, now) {
    const schedule = app.effectiveSchedule || app.schedule;
    const displayBlock = state.current || state.next || findBlockById(schedule, app.selectedBlockId);
    if (!displayBlock) {
      els.currentTaskTitle.textContent = "计划已结束";
      els.currentTaskMeta.textContent = "所有任务窗口已经结束。";
      els.currentTaskDescription.textContent = "导出机会记录、复盘和完成状态，进入下一轮求职反馈闭环。";
      els.countdownLabel.textContent = "状态";
      els.countdownText.textContent = "结束";
      els.completeCurrentBtn.disabled = true;
      setList(els.currentDeliverables, []);
      setList(els.currentQuestions, []);
      els.currentJavaMapping.textContent = "--";
      els.currentAcceptance.textContent = "--";
      if (els.nextTaskText) els.nextTaskText.textContent = "无后续任务";
      renderCompletionEvidence(app, els, null, state);
      return;
    }

    const completed = readJsonStorage(COMPLETED_KEY, {});
    const isCurrent = state.current && state.current.id === displayBlock.id;
    const countdownMs = isCurrent
      ? displayBlock.endDateTime.getTime() - now.getTime()
      : displayBlock.startDateTime.getTime() - now.getTime();

    els.currentBadge.className = `tag tag-${displayBlock.category}`;
    els.currentBadge.textContent = categoryLabel(schedule, displayBlock.category);
    els.currentTaskTitle.textContent = displayBlock.title;
    const currentDelayLabel = blockDelayLabel(displayBlock);
    els.currentTaskMeta.textContent = [
      `${displayBlock.day.date} ${displayBlock.day.weekday} · ${displayBlock.start}-${displayBlock.end}`,
      currentDelayLabel
    ].filter(Boolean).join(" · ");
    const descriptionPrefix = currentDelayLabel ? `这是${currentDelayLabel}任务，按补做节奏继续完成。` : "";
    els.currentTaskDescription.textContent = isCurrent
      ? `${descriptionPrefix}${displayBlock.description}`
      : state.code === "before"
        ? `计划尚未开始。你可以在“计划设置”里从今天开始 Day1、模拟某一天，或继续按原计划日期执行。下一个任务：${descriptionPrefix}${displayBlock.description}`
        : `当前不在任务时间内。下一个任务是：${descriptionPrefix}${displayBlock.description}`;
    els.countdownLabel.textContent = isCurrent ? "当前任务还剩" : "距离开始还有";
    els.countdownText.textContent = formatDuration(countdownMs);
    els.completeCurrentBtn.disabled = false;
    els.completeCurrentBtn.textContent = state.code === "before"
      ? "从今天开始 Day1"
      : completed[displayBlock.id]
        ? "取消完成"
        : "标记完成";
    setList(els.currentDeliverables, displayBlock.deliverables);
    setList(els.currentQuestions, displayBlock.interviewQuestions);
    els.currentJavaMapping.textContent = displayBlock.javaMapping || "--";
    els.currentAcceptance.textContent = displayBlock.acceptance || "--";
    if (els.nextTaskText) {
      const next = state.current ? state.next : displayBlock;
      els.nextTaskText.textContent = next
        ? [
          `${next.day.date} ${next.start}-${next.end} · ${next.title}`,
          blockDelayLabel(next)
        ].filter(Boolean).join(" · ")
        : "当前已是最后一个任务窗口";
    }
    renderCompletionEvidence(app, els, displayBlock, state);
    renderTodayInterviewEntry(app, els, state);
  }

  function openTaskDetail(app, els, blockId, state, now) {
    app.selectedBlockId = blockId;
    renderDetail(app, els, state);
    renderPathCards(app, els, state);
    renderSelectedDay(app, els, state, now);
    openSheet(app, els, "taskDetail");
  }

  function renderSelectedDay(app, els, state, now) {
    const schedule = app.effectiveSchedule || app.schedule;
    const day = getDayByDate(schedule, app.selectedDate) || state.today || schedule.days[0];
    app.selectedDate = day.date;
    els.todayTitle.textContent = `${day.date} ${day.weekday} · ${day.theme}`;
    els.reviewTitle.textContent = `${day.date} 每日复盘`;
    els.applicationForm.elements.date.value = day.date;

    const summary = document.createDocumentFragment();
    [
      ["当天目标", day.goal || "--"],
      ["当天产出", arraysToText(day.dailyDeliverables) || "--"],
      ["Java 补强", day.javaFocus || "--"]
    ].forEach(([label, text]) => {
      const item = document.createElement("div");
      item.innerHTML = `<span>${label}</span><strong>${text}</strong>`;
      summary.appendChild(item);
    });
    clearAndAppend(els.todaySummary, summary);

    const completed = readJsonStorage(COMPLETED_KEY, {});
    const blocks = day.blocks
      .map((block) => ({
        ...block,
        day,
        startDateTime: parseSgDateTime(day.date, block.start),
        endDateTime: parseSgDateTime(block.endDate || day.date, block.end)
      }))
      .filter((block) => matchesBlock(block, app.filters, completed));

    els.timeline.innerHTML = "";
    if (blocks.length === 0) {
      const empty = document.createElement("div");
      empty.className = "task-row";
      empty.textContent = "没有匹配的任务。";
      els.timeline.appendChild(empty);
      return;
    }

    blocks.forEach((block) => {
      const row = document.createElement("article");
      row.className = `task-row ${getBlockVisualState(block, state, completed, now)}${block.id === app.selectedBlockId ? " selected" : ""}`;
      row.tabIndex = 0;
      row.addEventListener("click", () => {
        openTaskDetail(app, els, block.id, state, now);
      });
      row.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          openTaskDetail(app, els, block.id, state, now);
        }
      });

      const time = document.createElement("div");
      time.className = "time-range";
      time.textContent = `${block.start}-${block.end}`;

      const body = document.createElement("div");
      const tag = document.createElement("span");
      tag.className = `tag tag-${block.category}`;
      tag.textContent = categoryLabel(schedule, block.category);
      body.appendChild(tag);
      const delayText = blockDelayLabel(block);
      if (delayText) {
        const delayTag = document.createElement("span");
        delayTag.className = "tag tag-review";
        delayTag.textContent = delayText;
        body.appendChild(delayTag);
      }
      const title = document.createElement("h3");
      title.textContent = block.title;
      body.appendChild(title);
      const desc = document.createElement("p");
      desc.textContent = delayText ? `补做任务：${block.description}` : block.description;
      body.appendChild(desc);

      const actions = document.createElement("div");
      actions.className = "task-actions";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = Boolean(completed[block.id]);
      checkbox.setAttribute("aria-label", `完成 ${block.title}`);
      checkbox.addEventListener("click", (event) => {
        event.stopPropagation();
        if (checkbox.checked && !hasCompletionEvidence(app, block)) {
          checkbox.checked = false;
          window.alert("先补一条证据再标记完成：每日复盘、口述评分或机会反馈证据至少要有一项。");
          return;
        }
        const nextCompleted = readJsonStorage(COMPLETED_KEY, {});
        nextCompleted[block.id] = checkbox.checked;
        writeJsonStorage(COMPLETED_KEY, nextCompleted);
        syncProgress(nextCompleted);
        renderAll(app, els);
      });
      const detailButton = document.createElement("button");
      detailButton.type = "button";
      detailButton.textContent = "详情";
      detailButton.addEventListener("click", (event) => {
        event.stopPropagation();
        openTaskDetail(app, els, block.id, state, now);
      });
      actions.append(checkbox, detailButton);
      row.append(time, body, actions);
      els.timeline.appendChild(row);
    });
  }

  function getBlockVisualState(block, state, completed, now) {
    if (completed[block.id]) return "done";
    if (state.current && state.current.id === block.id) return "current";
    if (block.endDateTime.getTime() < now.getTime()) return "overdue";
    return "upcoming";
  }

  function renderOverview(app, els, state, now) {
    const schedule = app.effectiveSchedule || app.schedule;
    const completed = readJsonStorage(COMPLETED_KEY, {});
    els.overview.innerHTML = "";
    schedule.days.forEach((day) => {
      const button = document.createElement("button");
      button.type = "button";
      const done = day.blocks.filter((block) => completed[block.id]).length;
      const total = day.blocks.length;
      const percent = total ? Math.round((done / total) * 100) : 0;
      const pathMissing = day.blocks.filter((block) => block.pathStatus && block.pathStatus !== "all-ok").length;
      const containsAgent = day.blocks.some((block) => block.category === "agent");
      const containsInterview = day.blocks.some((block) => block.category === "interview");
      const containsResume = day.blocks.some((block) => block.category === "resume");
      const dayStart = parseSgDateTime(day.date, "00:00").getTime();
      const dayEnd = parseSgDateTime(day.date, "23:59").getTime();
      const classes = ["day-card"];
      if (day.date === app.selectedDate) classes.push("selected");
      if (now.getTime() >= dayStart && now.getTime() <= dayEnd) classes.push("today");
      if (now.getTime() > dayEnd) classes.push("past");
      button.className = classes.join(" ");
      button.innerHTML = `
        <span class="date">${day.date} ${day.weekday}</span>
        <strong>${day.theme}</strong>
        <span class="muted">${done}/${total} blocks</span>
        <span class="muted">路径：${pathMissing ? `${pathMissing} 个任务异常` : "全部可用"}</span>
        <div class="progress-bar"><span style="width:${percent}%"></span></div>
      `;
      const stack = document.createElement("div");
      stack.className = "category-stack";
      [
        containsAgent ? "含供小慧" : "",
        containsInterview ? "含模拟" : "",
        containsResume ? "含机会" : ""
      ].filter(Boolean).forEach((label) => {
        const tag = document.createElement("span");
        tag.className = "tag tag-muted";
        tag.textContent = label;
        stack.appendChild(tag);
      });
      [...new Set(day.blocks.map((block) => block.category))].forEach((category) => {
        const tag = document.createElement("span");
        tag.className = `tag tag-${category}`;
        tag.textContent = categoryLabel(schedule, category);
        stack.appendChild(tag);
      });
      button.appendChild(stack);
      button.addEventListener("click", () => {
        app.selectedDate = day.date;
        app.selectedBlockId = day.blocks[0].id;
        app.lastReviewDate = null;
        renderAll(app, els);
      });
      els.overview.appendChild(button);
    });
  }

  function taskDetailBlocks(block) {
    return [
      ["描述", block.description],
      ["必须阅读", block.mustRead || []],
      ["必须跑通", block.commands || []],
      ["必须产出", block.deliverables || []],
      ["必须会答", block.interviewQuestions || []],
      ["Java 映射", block.javaMapping || "--"],
      ["验收标准", block.acceptance || "--"],
      ["当天风险", block.day && block.day.risk ? block.day.risk : "--"]
    ];
  }

  function appendDetailBlocks(container, detailBlocks) {
    container.innerHTML = "";
    detailBlocks.forEach(([title, value]) => {
      const section = document.createElement("section");
      section.className = "detail-block";
      const h3 = document.createElement("h3");
      h3.textContent = title;
      section.appendChild(h3);
      if (Array.isArray(value)) {
        if (title === "必须跑通" && value.length > 0) {
          const pre = document.createElement("pre");
          pre.textContent = value.map((item) => item.copyCommand || formatListItem(item)).join("\n");
          section.appendChild(pre);
        } else {
          section.appendChild(createList(value));
        }
      } else {
        const p = document.createElement("p");
        p.textContent = value;
        section.appendChild(p);
      }
      container.appendChild(section);
    });
  }

  function renderTaskDetailSheet(app, els, block) {
    if (!els.taskDetailSheet || !els.taskDetailSheetBody) return;
    if (!block) {
      els.taskDetailSheetTitle.textContent = "任务详情";
      els.taskDetailSheetBody.textContent = "暂无任务。";
      return;
    }
    const schedule = app.effectiveSchedule || app.schedule;
    const completed = readJsonStorage(COMPLETED_KEY, {});
    els.taskDetailSheetMeta.textContent = `${block.day.date} ${block.start}-${block.end} · ${categoryLabel(schedule, block.category)}`;
    els.taskDetailSheetTitle.textContent = block.title;
    appendDetailBlocks(els.taskDetailSheetBody, taskDetailBlocks(block));
    if (els.taskDetailCompleteBtn) {
      els.taskDetailCompleteBtn.textContent = completed[block.id] ? "取消完成" : "标记完成";
      els.taskDetailCompleteBtn.onclick = () => {
        const nextCompleted = readJsonStorage(COMPLETED_KEY, {});
        const nextValue = !nextCompleted[block.id];
        if (nextValue && !hasCompletionEvidence(app, block)) {
          window.alert("先补一条证据再标记完成：每日复盘、口述评分或机会反馈证据至少要有一项。");
          return;
        }
        nextCompleted[block.id] = nextValue;
        writeJsonStorage(COMPLETED_KEY, nextCompleted);
        syncProgress(nextCompleted);
        renderAll(app, els);
      };
    }
  }

  function renderDetail(app, els, state) {
    const schedule = app.effectiveSchedule || app.schedule;
    const block = findBlockById(schedule, app.selectedBlockId) || state.current || state.next;
    if (!block) {
      els.detailTitle.textContent = "任务详情";
      els.detailPanel.textContent = "暂无任务。";
      renderTaskDetailSheet(app, els, null);
      return;
    }

    els.detailTitle.textContent = block.title;
    appendDetailBlocks(els.detailPanel, taskDetailBlocks(block));
    renderTaskDetailSheet(app, els, block);
  }

  function renderPathCards(app, els, state) {
    if (!els.pathCards) return;
    const schedule = app.effectiveSchedule || app.schedule;
    const block = findBlockById(schedule, app.selectedBlockId) || state.current || state.next;
    els.pathCards.innerHTML = "";
    if (!block) {
      if (els.pathSummary) els.pathSummary.textContent = "当前任务没有路径卡片";
      els.pathCards.innerHTML = '<p class="muted">暂无任务路径。</p>';
      return;
    }
    const items = [];
    (block.mustRead || []).forEach((item) => {
      items.push({
        type: "file",
        title: item.label || item.relativePath,
        usage: item.usage,
        status: item.exists === false || item.status === "missing" ? "缺失" : "存在",
        rootName: item.rootName || "",
        absolutePath: item.absolutePath || "",
        relativePath: item.relativePath || item.path || "",
        command: item.openCommand || item.codeCommand || ""
      });
    });
    (block.commands || []).forEach((item) => {
      items.push({
        type: "command",
        title: item.label || "运行命令",
        usage: "必须跑通",
        status: "命令",
        rootName: "cwd",
        absolutePath: item.workingDirectory || item.cwd || "",
        relativePath: item.command || "",
        command: item.copyCommand || item.command || ""
      });
    });
    (block.artifacts || []).forEach((item) => {
      items.push({
        type: "artifact",
        title: item.label,
        usage: item.note,
        status: "待产出",
        rootName: "artifact",
        absolutePath: item.artifactKey,
        relativePath: item.storage,
        command: ""
      });
    });
    if (items.length === 0) {
      if (els.pathSummary) els.pathSummary.textContent = "当前任务不需要文件路径，点击展开";
      els.pathCards.innerHTML = '<p class="muted">该任务没有路径或命令。</p>';
      return;
    }
    const missingCount = items.filter((item) => item.status === "缺失").length;
    if (els.pathSummary) {
      els.pathSummary.textContent = `当前任务需要 ${items.length} 个文件/命令${missingCount ? `，${missingCount} 个路径问题` : ""}，点击展开`;
    }
    items.forEach((item) => {
      const card = document.createElement("article");
      card.className = `path-card path-${item.status === "缺失" ? "missing" : item.type}`;
      const commandButton = item.command
        ? `<button type="button" data-copy="${escapeHtml(item.command)}">复制命令</button>`
        : "";
      card.innerHTML = `
        <div class="path-card-head">
          <span class="tag tag-muted">${escapeHtml(item.status)}</span>
          <strong>${escapeHtml(item.title || "--")}</strong>
        </div>
        <p>${escapeHtml(item.usage || "--")}</p>
        <dl>
          <dt>根目录</dt><dd>${escapeHtml(item.rootName || "--")}</dd>
          <dt>绝对路径 / 产物键</dt><dd>${escapeHtml(item.absolutePath || "--")}</dd>
          <dt>相对路径 / 命令</dt><dd>${escapeHtml(item.relativePath || "--")}</dd>
        </dl>
        ${commandButton}
      `;
      card.querySelectorAll("[data-copy]").forEach((button) => {
        button.addEventListener("click", () => copyText(button.dataset.copy));
      });
      els.pathCards.appendChild(card);
    });
  }

  function renderReview(app, els) {
    if (app.lastReviewDate === app.selectedDate) {
      return;
    }
    const reviews = readJsonStorage(REVIEWS_KEY, {});
    const review = reviews[app.selectedDate] || {};
    els.reviewForm.elements.projectPoint.value = review.projectPoint || "";
    els.reviewForm.elements.interviewQuestions.value = review.interviewQuestions || "";
    els.reviewForm.elements.javaPoint.value = review.javaPoint || "";
    els.reviewForm.elements.pathIssues.value = review.pathIssues || "";
    els.reviewForm.elements.fragileAnswers.value = review.fragileAnswers || "";
    els.reviewForm.elements.tomorrowPriority.value = review.tomorrowPriority || "";
    app.lastReviewDate = app.selectedDate;
  }

  function saveCurrentReview(app, els) {
    if (isReadOnly(app)) return;
    const reviews = readJsonStorage(REVIEWS_KEY, {});
    reviews[app.selectedDate] = {
      projectPoint: els.reviewForm.elements.projectPoint.value,
      interviewQuestions: els.reviewForm.elements.interviewQuestions.value,
      javaPoint: els.reviewForm.elements.javaPoint.value,
      pathIssues: els.reviewForm.elements.pathIssues.value,
      fragileAnswers: els.reviewForm.elements.fragileAnswers.value,
      tomorrowPriority: els.reviewForm.elements.tomorrowPriority.value,
      updatedAt: new Date().toISOString()
    };
    writeJsonStorage(REVIEWS_KEY, reviews);
    syncReviews(reviews);
  }

  function hasCompletionEvidence(app, block) {
    return completionEvidenceDetails(app, block).hasEvidence;
  }

  function delayRecoverySummary(app, records) {
    const schedule = app.effectiveSchedule || app.schedule;
    const completed = readJsonStorage(COMPLETED_KEY, {});
    const delayedBlocks = flattenBlocks(schedule)
      .filter((block) => !completed[block.id] && Number(block.delayMinutes || 0) > 0);
    const totalMinutes = (Array.isArray(records) ? records : [])
      .reduce((sum, record) => sum + Number(record.minutes || 0), 0);
    const dates = Array.from(new Set(delayedBlocks.map((block) => block.day.date)));
    const now = getEffectiveNow(schedule, app.planSettings || readPlanSettings(), new Date());
    const nextDelayed = delayedBlocks.find((block) => block.startDateTime.getTime() >= now.getTime()) || delayedBlocks[0] || null;

    return {
      totalMinutes,
      delayedBlocks,
      dates,
      nextDelayed
    };
  }

  function renderDelayImpact(app, els, records) {
    if (!els.delayImpactSummary) return;
    const summary = delayRecoverySummary(app, records);
    if (!records.length) {
      els.delayImpactSummary.textContent = "暂无延期记录。登记突发事件后，会在这里显示影响任务和下一项补做。";
      if (els.openRecoveryTaskBtn) {
        els.openRecoveryTaskBtn.disabled = true;
        els.openRecoveryTaskBtn.textContent = "暂无补做任务";
      }
      app.nextRecoveryBlockId = "";
      return;
    }

    const affectedText = summary.delayedBlocks.length
      ? `影响 ${summary.delayedBlocks.length} 个未完成任务，覆盖 ${summary.dates.join("、")}。`
      : "当前没有未完成任务需要顺延补做。";
    const nextText = summary.nextDelayed
      ? `下一项补做：${summary.nextDelayed.day.date} ${summary.nextDelayed.start}-${summary.nextDelayed.end} · ${summary.nextDelayed.title}。`
      : "暂无下一项补做。";
    els.delayImpactSummary.textContent = `已登记 ${records.length} 次打断，共顺延 ${formatDuration(summary.totalMinutes * 60000)}；${affectedText}${nextText}`;

    if (els.openRecoveryTaskBtn) {
      els.openRecoveryTaskBtn.disabled = !summary.nextDelayed;
      els.openRecoveryTaskBtn.textContent = summary.nextDelayed ? "查看下一项补做" : "暂无补做任务";
    }
    app.nextRecoveryBlockId = summary.nextDelayed ? summary.nextDelayed.id : "";
  }

  function openNextRecoveryTask(app, els) {
    const schedule = app.effectiveSchedule || app.schedule;
    const block = app.nextRecoveryBlockId ? findBlockById(schedule, app.nextRecoveryBlockId) : null;
    if (!block) return;
    app.selectedDate = block.day.date;
    app.selectedBlockId = block.id;
    setActiveView(app, els, "schedule");
    renderAll(app, els);
  }

  function deleteApplicationRecord(id, els) {
    const nextRecords = readJsonStorage(APPLICATIONS_KEY, []).filter((item) => item.id !== id);
    writeJsonStorage(APPLICATIONS_KEY, nextRecords);
    syncApplicationDelete(id);
    renderApplications(els);
  }

  function updateApplicationStatus(id, status, els) {
    const nextRecords = readJsonStorage(APPLICATIONS_KEY, []).map((item) => (
      item.id === id ? { ...item, status } : item
    ));
    writeJsonStorage(APPLICATIONS_KEY, nextRecords);
    syncApplications(nextRecords);
    renderApplications(els);
  }

  function createApplicationStatusSelect(record, els) {
    const select = document.createElement("select");
    select.className = "application-status-select";
    select.setAttribute("aria-label", `更新 ${record.company || "机会记录"} 状态`);
    APPLICATION_STATUSES.forEach((status) => {
      const option = document.createElement("option");
      option.value = status;
      option.textContent = status;
      option.selected = status === normalizeApplicationStatus(record.status);
      select.appendChild(option);
    });
    select.addEventListener("change", () => {
      updateApplicationStatus(record.id, select.value, els);
    });
    return select;
  }

  function normalizeApplicationStatus(value) { return value === "已投递" ? "已记录" : (value === "待投递" ? "待沟通" : (APPLICATION_STATUSES.includes(value) ? value : "已记录")); }

  function renderApplications(els) {
    const records = readJsonStorage(APPLICATIONS_KEY, []);
    els.applicationRows.innerHTML = "";
    if (els.applicationCards) {
      els.applicationCards.innerHTML = "";
    }
    if (records.length === 0) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 9;
      cell.className = "muted";
      cell.textContent = "暂无机会记录。";
      row.appendChild(cell);
      els.applicationRows.appendChild(row);
      if (els.applicationCards) {
        const empty = document.createElement("div");
        empty.className = "empty-action";
        empty.textContent = "暂无机会记录。先在上方新增一条目标岗位。";
        els.applicationCards.appendChild(empty);
      }
      return;
    }
    records.forEach((record) => {
      const row = document.createElement("tr");
      [
        record.date,
        record.company,
        record.role,
        record.city,
        record.keywords,
        (record.tags || []).join(", "),
        record.resumeVersion
      ].forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value || "";
        row.appendChild(cell);
      });
      const statusCell = document.createElement("td");
      statusCell.appendChild(createApplicationStatusSelect(record, els));
      row.appendChild(statusCell);
      const action = document.createElement("td");
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "删除";
      button.addEventListener("click", () => {
        deleteApplicationRecord(record.id, els);
      });
      action.appendChild(button);
      row.appendChild(action);
      els.applicationRows.appendChild(row);

      if (els.applicationCards) {
        const card = document.createElement("article");
        card.className = "application-card";
        const title = document.createElement("div");
        title.className = "application-card-title";
        title.innerHTML = `<strong>${escapeHtml(record.company || "未填写公司")}</strong><span>${escapeHtml(record.city || "城市待补")}</span>`;
        const role = document.createElement("p");
        role.className = "application-role";
        role.textContent = record.role || "岗位待补";
        const meta = document.createElement("p");
        meta.className = "muted";
        meta.textContent = [record.date, record.resumeVersion].filter(Boolean).join(" · ") || "日期待补";
        const tags = document.createElement("p");
        tags.className = "application-tags";
        tags.textContent = [
          record.keywords,
          (record.tags || []).join("、")
        ].filter(Boolean).join(" · ") || "JD 标签待补";
        const footer = document.createElement("div");
        footer.className = "application-card-actions";
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "ghost-btn small";
        deleteButton.textContent = "删除";
        deleteButton.addEventListener("click", () => deleteApplicationRecord(record.id, els));
        footer.append(createApplicationStatusSelect(record, els), deleteButton);
        card.append(title, role, meta, tags, footer);
        els.applicationCards.appendChild(card);
      }
    });
  }

  function renderDelays(app, els) {
    const records = readJsonStorage(DELAYS_KEY, []);
    els.delayRows.innerHTML = "";
    renderDelayImpact(app, els, records);
    if (records.length === 0) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 5;
      cell.className = "muted";
      cell.textContent = "暂无延期记录。遇到突发事件时在这里登记，后续未完成任务会顺延。";
      row.appendChild(cell);
      els.delayRows.appendChild(row);
      return;
    }
    records.forEach((record) => {
      const row = document.createElement("tr");
      [record.start, record.end, formatDuration(Number(record.minutes) * 60000), record.reason].forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value || "";
        row.appendChild(cell);
      });
      const action = document.createElement("td");
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "删除";
      button.addEventListener("click", () => {
        const next = readJsonStorage(DELAYS_KEY, []).filter((item) => item.id !== record.id);
        writeJsonStorage(DELAYS_KEY, next);
        renderAll(app, els);
      });
      action.appendChild(button);
      row.appendChild(action);
      els.delayRows.appendChild(row);
    });
  }

  function generatedKbEntries() {
    return readJsonStorage(GENERATED_KB_KEY, [])
      .filter((entry) => entry && typeof entry === "object" && entry.id);
  }

  function allKbEntries(app) {
    const fixed = (app.interviewKb && app.interviewKb.entries) || [];
    return fixed.concat(generatedKbEntries());
  }

  function allKbCategories(app) {
    const categories = new Set((app.interviewKb && app.interviewKb.categories) || []);
    generatedKbEntries().forEach((entry) => {
      if (entry.category) categories.add(entry.category);
    });
    return Array.from(categories);
  }

  function persistGeneratedKbEntries(entries) {
    const seen = new Set();
    const cleaned = (Array.isArray(entries) ? entries : [])
      .filter((entry) => {
        if (!entry || !entry.id || seen.has(entry.id) || /python|pytest|uvicorn|FastAPI|\.py\b/i.test(JSON.stringify(entry))) {
          return false;
        }
        seen.add(entry.id);
        return true;
      })
      .slice(0, 80);
    writeJsonStorage(GENERATED_KB_KEY, cleaned);
  }

  function currentTaskPayload(app) {
    const schedule = app.effectiveSchedule || app.schedule;
    const state = getPlanState(schedule, getEffectiveNow(schedule, app.planSettings, new Date()));
    const block = state.current || state.next || findBlockById(schedule, app.selectedBlockId);
    if (!block) return null;
    return {
      id: block.id,
      title: block.title,
      category: block.category,
      description: block.description,
      javaMapping: block.javaMapping,
      interviewQuestions: block.interviewQuestions || []
    };
  }

  function populateKbCategoryOptions(app, els) {
    if (!els.kbCategoryFilter) return;
    const selected = app.filters.kbCategory || "all";
    els.kbCategoryFilter.innerHTML = '<option value="all">全部分类</option>';
    allKbCategories(app).forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      els.kbCategoryFilter.appendChild(option);
    });
    els.kbCategoryFilter.value = allKbCategories(app).includes(selected) ? selected : "all";
    app.filters.kbCategory = els.kbCategoryFilter.value;
  }

  function findKbEntryById(app, id) {
    const entries = allKbEntries(app);
    return entries.find((entry) => entry.id === id) || null;
  }

  function toggleKbCollection(key, id) {
    if (!id) return false;
    const values = readStringSet(key);
    if (values.has(id)) {
      values.delete(id);
      writeStringSet(key, values);
      return false;
    }
    values.add(id);
    writeStringSet(key, values);
    return true;
  }

  function kbEntryTags(entry, favorites, mistakes) {
    return [
      entry.category,
      entry.javaMapping ? "Java 映射" : "",
      entry.projectEvidence ? "项目证据" : "",
      entry.sourceType && /^generated/.test(entry.sourceType) ? "AI 生成" : "",
      favorites.has(entry.id) ? "已收藏" : "",
      mistakes.has(entry.id) ? "错题" : ""
    ].filter(Boolean).slice(0, 5);
  }

  function startKbPractice(app, els, entry, prefix = "kb") {
    if (!entry) return;
    app.activeKbEntryId = entry.id;
    els.answerText.value = "";
    app.activeQuestion = {
      id: `${prefix}-${entry.id}`,
      mode: "resume-java",
      source: `${entry.category} · ${entry.title}`,
      question: entry.interviewQuestion,
      hint: entry.publicSummary,
      expectedKeywords: [entry.category, entry.javaMapping, entry.projectEvidence].filter(Boolean)
    };
    setActiveView(app, els, "interview");
    renderInterview(app, els, getPlanState(app.effectiveSchedule || app.schedule, getEffectiveNow(app.effectiveSchedule || app.schedule, app.planSettings, new Date())));
    renderKnowledgeBase(app, els);
    focusAnswerBox(els);
  }

  function renderKbCategoryChips(app, els) {
    if (!els.kbCategoryChips) return;
    const categories = allKbCategories(app);
    const chips = ["all"].concat(categories.slice(0, 10));
    els.kbCategoryChips.innerHTML = "";
    chips.forEach((category) => {
      const label = category === "all" ? "全部" : category;
      const button = createFilterButton(label, () => {
        app.filters.kbCategory = category;
        if (els.kbCategoryFilter) {
          els.kbCategoryFilter.value = category;
        }
        renderKbCategoryChips(app, els);
        renderKnowledgeBase(app, els);
      }, app.filters.kbCategory === category);
      els.kbCategoryChips.appendChild(button);
    });
  }

  function appendKbDetailSection(container, title, value, options = {}) {
    const section = document.createElement(options.collapsible ? "details" : "section");
    section.className = "kb-detail-section";
    if (options.collapsible) {
      const summary = document.createElement("summary");
      summary.textContent = title;
      section.appendChild(summary);
      if (options.open) section.open = true;
    } else {
      const h3 = document.createElement("h3");
      h3.textContent = title;
      section.appendChild(h3);
    }
    if (Array.isArray(value)) {
      section.appendChild(createList(value));
    } else {
      const p = document.createElement("p");
      p.textContent = value || "--";
      section.appendChild(p);
    }
    container.appendChild(section);
  }

  function renderKbDetailSheet(app, els, entry) {
    if (!els.kbDetailSheet || !els.kbDetailBody || !entry) return;
    const favorites = readStringSet(KB_FAVORITES_KEY);
    const mistakes = readStringSet(KB_MANUAL_MISTAKES_KEY);
    app.activeKbDetailId = entry.id;
    els.kbDetailMeta.textContent = entry.category || "Knowledge detail";
    els.kbDetailTitle.textContent = entry.title || "知识点详情";
    els.kbDetailBody.innerHTML = "";
    appendKbDetailSection(els.kbDetailBody, "概览", entry.publicSummary);
    appendKbDetailSection(els.kbDetailBody, "60 秒回答", entry.answer60s);
    appendKbDetailSection(els.kbDetailBody, "3 分钟回答", entry.answer3min, { collapsible: true });
    appendKbDetailSection(els.kbDetailBody, "追问风险", entry.risk, { collapsible: true });
    appendKbDetailSection(els.kbDetailBody, "不能说", entry.doNotSay || [], { collapsible: true });
    appendKbDetailSection(els.kbDetailBody, "安全表达", entry.safeWording || [], { collapsible: true });
    appendKbDetailSection(els.kbDetailBody, "Java 映射", entry.javaMapping, { collapsible: true });
    appendKbDetailSection(els.kbDetailBody, "项目证据", entry.projectEvidence, { collapsible: true });
    if (els.kbFavoriteBtn) {
      els.kbFavoriteBtn.textContent = favorites.has(entry.id) ? "取消收藏" : "收藏";
    }
    if (els.kbMistakeBtn) {
      els.kbMistakeBtn.textContent = mistakes.has(entry.id) ? "移出错题" : "加入错题";
    }
  }

  function openKbDetail(app, els, entry) {
    renderKbDetailSheet(app, els, entry);
    openSheet(app, els, "kbDetail");
  }

  function filteredKbEntries(app) {
    const entries = allKbEntries(app);
    const query = String(app.filters.kbQuery || "").trim().toLowerCase();
    const category = app.filters.kbCategory || "all";
    const favorites = readStringSet(KB_FAVORITES_KEY);
    const mistakes = readStringSet(KB_MANUAL_MISTAKES_KEY);
    return entries.filter((entry) => {
      if (category !== "all" && entry.category !== category) return false;
      if (app.filters.kbFavoritesOnly && !favorites.has(entry.id)) return false;
      if (app.filters.kbMistakesOnly && !mistakes.has(entry.id)) return false;
      if (!query) return true;
      const text = [
        entry.category,
        entry.title,
        entry.publicSummary,
        entry.interviewQuestion,
        entry.answer60s,
        entry.answer3min,
        entry.javaMapping,
        entry.projectEvidence,
        entry.risk,
        arraysToText(entry.doNotSay),
        arraysToText(entry.safeWording)
      ].join(" ").toLowerCase();
      return text.includes(query);
    });
  }

  function renderKnowledgeBase(app, els) {
    if (!els.kbEntries) return;
    populateKbCategoryOptions(app, els);
    const entries = filteredKbEntries(app);
    const favorites = readStringSet(KB_FAVORITES_KEY);
    const mistakes = readStringSet(KB_MANUAL_MISTAKES_KEY);
    els.kbEntries.innerHTML = "";
    if (entries.length === 0) {
      els.kbEntries.innerHTML = '<div class="empty-action"><span>没有匹配的知识库条目。</span><button class="ghost-btn small" type="button" data-kb-reset>清空筛选</button></div>';
      const reset = els.kbEntries.querySelector("[data-kb-reset]");
      reset.addEventListener("click", () => {
        app.filters.kbQuery = "";
        app.filters.kbCategory = "all";
        app.filters.kbFavoritesOnly = false;
        app.filters.kbMistakesOnly = false;
        if (els.kbSearchInput) els.kbSearchInput.value = "";
        if (els.kbCategoryFilter) els.kbCategoryFilter.value = "all";
        if (els.kbFavoritesOnly) els.kbFavoritesOnly.checked = false;
        if (els.kbMistakesOnly) els.kbMistakesOnly.checked = false;
        renderKbCategoryChips(app, els);
        renderKnowledgeBase(app, els);
      });
      return;
    }
    entries.forEach((entry) => {
      const card = document.createElement("article");
      card.className = `kb-card ${entry.id === app.activeKbEntryId ? "selected" : ""}`;
      const tags = kbEntryTags(entry, favorites, mistakes)
        .map((tag) => `<span class="tag tag-muted">${escapeHtml(tag)}</span>`)
        .join("");
      card.innerHTML = `
        <div class="kb-card-head">
          <div>
            <div class="kb-tag-row">${tags}</div>
            <h3>${escapeHtml(entry.title || "--")}</h3>
          </div>
        </div>
        <p class="kb-summary">${escapeHtml(entry.publicSummary || "--")}</p>
        <div class="kb-card-actions">
          <button class="primary-btn small" type="button" data-kb-detail>查看详情</button>
          <button class="ghost-btn small" type="button" data-kb-practice>练这题</button>
          <button class="ghost-btn small" type="button" data-kb-favorite>${favorites.has(entry.id) ? "已收藏" : "收藏"}</button>
        </div>
      `;
      card.addEventListener("click", () => {
        openKbDetail(app, els, entry);
      });
      card.querySelector("[data-kb-detail]").addEventListener("click", (event) => {
        event.stopPropagation();
        openKbDetail(app, els, entry);
      });
      card.querySelector("[data-kb-practice]").addEventListener("click", (event) => {
        event.stopPropagation();
        startKbPractice(app, els, entry);
      });
      card.querySelector("[data-kb-favorite]").addEventListener("click", (event) => {
        event.stopPropagation();
        toggleKbCollection(KB_FAVORITES_KEY, entry.id);
        renderKnowledgeBase(app, els);
      });
      els.kbEntries.appendChild(card);
    });
  }

  async function generateKnowledgeEntries(app, els) {
    if (!els.kbGenerateStatus) return;
    if (isReadOnly(app) || !can(app, "ai:use")) {
      els.kbGenerateStatus.textContent = "当前账号没有生成知识库的权限。";
      return;
    }
    const currentTask = currentTaskPayload(app);
    const topic = (els.kbGenerateTopicInput && els.kbGenerateTopicInput.value.trim())
      || (currentTask && currentTask.title)
      || "高级 Java 后端面试";
    if (els.generateKbBtn) els.generateKbBtn.disabled = true;
    if (els.kbGenerateForm) {
      const submit = els.kbGenerateForm.querySelector("button[type='submit']");
      if (submit) submit.disabled = true;
    }
    els.kbGenerateStatus.textContent = "正在生成面试题和知识条目...";
    try {
      const result = await apiJson("/api/generate-kb", {
        method: "POST",
        body: {
          topic,
          currentTask,
          existingCategories: allKbCategories(app).slice(0, 20)
        }
      });
      const existing = generatedKbEntries();
      const entries = (result.entries || []).map((entry) => ({
        ...entry,
        id: entry.id || `generated-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        sourceType: entry.sourceType || (result.provider === "anthropic-compatible" ? "generated-ai" : "generated-local")
      }));
      const before = existing.length;
      persistGeneratedKbEntries(entries.concat(existing));
      const saved = generatedKbEntries().length - before;
      app.filters.kbCategory = "all";
      app.filters.kbQuery = topic;
      if (els.kbSearchInput) els.kbSearchInput.value = topic;
      populateKbCategoryOptions(app, els);
      renderKbCategoryChips(app, els);
      renderKnowledgeBase(app, els);
      els.kbGenerateStatus.textContent = saved > 0
        ? `已生成 ${saved} 条，来源：${result.provider || "unknown"}。`
        : "生成结果被内容护栏过滤，请换一个更具体的 Java 主题再试。";
    } catch (error) {
      els.kbGenerateStatus.textContent = `生成失败：${error.message || "请稍后重试"}`;
    } finally {
      if (els.generateKbBtn) els.generateKbBtn.disabled = false;
      if (els.kbGenerateForm) {
        const submit = els.kbGenerateForm.querySelector("button[type='submit']");
        if (submit) submit.disabled = false;
      }
    }
  }

  function questionCandidates(app, state) {
    const mode = elsValue(app, "questionMode") || "auto";
    const questions = (app.interviewContext && app.interviewContext.questionBank) || [];
    if (mode !== "auto") {
      return questions.filter((question) => question.mode === mode);
    }
    const current = state && (state.current || state.next);
    if (!current) {
      return questions.filter((question) => question.mode === "resume-java");
    }
    if (/LLM|RAG|Agent|AI|模型|检索|初学/.test([current.title, current.description, current.javaMapping].join(" "))) {
      return questions.filter((question) => question.mode === "llm-basics" || question.mode === "jd-match");
    }
    if (current.category === "java") {
      return questions.filter((question) => question.mode === "java-core" || question.mode === "resume-java");
    }
    if (current.category === "resume") {
      return questions.filter((question) => question.mode === "jd-match" || question.mode === "resume-java");
    }
    return questions.filter((question) => question.mode === "resume-java" || question.mode === "llm-basics");
  }

  function elsValue(app, name) {
    const element = typeof document !== "undefined" ? document.getElementById(name) : null;
    return element ? element.value : null;
  }

  function selectInterviewQuestion(app, els, advance) {
    const state = getPlanState(app.effectiveSchedule || app.schedule, getEffectiveNow(app.effectiveSchedule || app.schedule, app.planSettings, new Date()));
    const candidates = questionCandidates(app, state);
    if (candidates.length === 0) {
      app.activeQuestion = null;
      return null;
    }
    if (advance || !app.activeQuestion) {
      app.questionCursor = (app.questionCursor + (advance ? 1 : 0)) % candidates.length;
      app.activeQuestion = candidates[app.questionCursor];
      els.answerText.value = "";
    }
    return app.activeQuestion;
  }

  function renderInterview(app, els, state) {
    const question = app.activeQuestion || selectInterviewQuestion(app, els, false);
    if (!question) {
      els.questionText.textContent = "暂无题库";
      els.questionHint.textContent = "请检查 data/interview_context.json。";
      els.questionSource.textContent = "--";
      renderInterviewSessions(els);
      renderInterviewMistakes(app, els);
      return;
    }
    els.questionSource.textContent = question.source || question.mode;
    els.questionText.textContent = question.question;
    els.questionHint.textContent = question.hint || "先答一版，再根据评分修正。";
    renderInterviewSessions(els);
    renderInterviewMistakes(app, els);
  }

  function localAnswerScore(question, answer) {
    const expected = question.expectedKeywords || [];
    const normalized = String(answer || "").toLowerCase();
    const matched = expected.filter((keyword) => normalized.includes(String(keyword).toLowerCase()));
    const lengthScore = Math.min(30, Math.floor(String(answer || "").trim().length / 12));
    const keywordScore = expected.length ? Math.round((matched.length / expected.length) * 45) : 20;
    const structureScore = /第一|第二|第三|首先|其次|最后|边界|风险|排查|证据/.test(answer || "") ? 15 : 5;
    const score = Math.max(10, Math.min(82, lengthScore + keywordScore + structureScore));
    const missing = expected.filter((keyword) => !matched.includes(keyword));
    return {
      provider: "local-fallback",
      score,
      level: score >= 75 ? "可用，但还要压实证据" : score >= 55 ? "基本能接，需要补链路" : "容易被追问击穿",
      strengths: matched.length ? [`已覆盖：${matched.join("、")}`] : ["完成了第一版回答"],
      weaknesses: missing.slice(0, 5).map((keyword) => `缺少：${keyword}`),
      rewrite: "按“背景 -> 职责 -> 链路 -> 异常/边界 -> Java 映射”再答一遍。",
      followUp: "请补充一个真实项目证据：文件、链路、指标或排查命令任选一个。"
    };
  }

  async function scoreCurrentAnswer(app, els) {
    if (isReadOnly(app) || !can(app, "ai:use")) {
      els.scoreResult.textContent = "当前账号没有 AI 评分权限。";
      return;
    }
    const question = app.activeQuestion || selectInterviewQuestion(app, els, false);
    const answer = els.answerText.value.trim();
    if (!question || !answer) {
      els.scoreResult.textContent = "请先选择题目并输入回答。";
      return;
    }
    els.scoreAnswerBtn.disabled = true;
    els.scoreResult.textContent = "评分中...";
    const currentState = getPlanState(app.effectiveSchedule || app.schedule, getEffectiveNow(app.effectiveSchedule || app.schedule, app.planSettings, new Date()));
    const payload = {
      question: question.question,
      answer,
      expectedKeywords: question.expectedKeywords || [],
      source: question.source,
      mode: question.mode,
      currentTask: currentState.current || currentState.next || null
    };
    let result;
    try {
      const response = await fetch(resolveAppPath("/api/score-answer"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      result = await response.json();
    } catch (error) {
      result = {
        ...localAnswerScore(question, answer),
        provider: "local-fallback",
        weaknesses: [`AI 评分不可用，已使用本地规则评分：${error.message}`].concat(localAnswerScore(question, answer).weaknesses)
      };
    } finally {
      els.scoreAnswerBtn.disabled = false;
    }
    saveInterviewSession(question, answer, result);
    renderScoreResult(els, result);
    renderInterviewSessions(els);
    renderInterviewMistakes(app, els);
  }

  function renderScoreResult(els, result) {
    const strengths = Array.isArray(result.strengths) ? result.strengths : [];
    const weaknesses = Array.isArray(result.weaknesses) ? result.weaknesses : [];
    els.scoreResult.innerHTML = `
      <div class="score-head">
        <strong>${Number(result.score || 0)} 分</strong>
        <span>${result.level || ""}</span>
        <span class="tag tag-muted">${result.provider || "unknown"}</span>
      </div>
      <div class="score-columns">
        <div><h3>做得好的地方</h3>${createList(strengths).outerHTML}</div>
        <div><h3>必须修正</h3>${createList(weaknesses).outerHTML}</div>
      </div>
      <div class="detail-block"><h3>稳妥改写</h3><p>${escapeHtml(result.rewrite || "--")}</p></div>
      <div class="detail-block"><h3>下一追问</h3><p>${escapeHtml(result.followUp || "--")}</p></div>
    `;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function saveInterviewSession(question, answer, result) {
    const activeApp = typeof window !== "undefined" ? window.__JOB_SPRINT_APP__ : null;
    if (activeApp && isReadOnly(activeApp)) return;
    const records = readJsonStorage(INTERVIEW_SESSIONS_KEY, []);
    const record = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toISOString(),
      questionId: question.id,
      question: question.question,
      answer,
      score: result.score,
      level: result.level,
      followUp: result.followUp,
      provider: result.provider
    };
    records.unshift(record);
    writeJsonStorage(INTERVIEW_SESSIONS_KEY, records.slice(0, 50));
    if (Number(result.score || 0) < 75) {
      const mistakes = readJsonStorage(INTERVIEW_MISTAKES_KEY, []);
      mistakes.unshift(record);
      writeJsonStorage(INTERVIEW_MISTAKES_KEY, mistakes.slice(0, 100));
      syncInterviewMistake(record);
    }
  }

  function renderInterviewMistakes(app, els) {
    if (!els.mistakeList) return;
    const mistakes = readJsonStorage(INTERVIEW_MISTAKES_KEY, []);
    els.mistakeList.innerHTML = "";
    if (els.practiceLatestMistakeBtn) {
      els.practiceLatestMistakeBtn.disabled = mistakes.length === 0;
    }
    if (mistakes.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-action";
      const text = document.createElement("span");
      text.textContent = "暂无错题。先答一版，低于 75 分会自动进入这里。";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "ghost-btn small";
      button.textContent = "回答当前题";
      button.addEventListener("click", () => focusAnswerBox(els));
      empty.append(text, button);
      els.mistakeList.appendChild(empty);
      return;
    }

    mistakes.slice(0, 4).forEach((record) => {
      const card = document.createElement("article");
      card.className = "mistake-card";
      const body = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = record.question || "未命名错题";
      const meta = document.createElement("span");
      meta.className = "muted";
      meta.textContent = `${record.score || "--"} 分 · ${record.provider || "unknown"}`;
      const follow = document.createElement("p");
      follow.textContent = record.followUp || "重练时补充项目证据、异常分支和 Java 映射。";
      body.append(title, meta, follow);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "primary-btn small";
      button.textContent = "重练";
      button.addEventListener("click", () => {
        openInterviewPractice(app, els, questionFromMistake(record));
      });
      card.append(body, button);
      els.mistakeList.appendChild(card);
    });
  }

  function renderInterviewSessions(els) {
    const records = readJsonStorage(INTERVIEW_SESSIONS_KEY, []);
    els.sessionRows.innerHTML = "";
    if (records.length === 0) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 4;
      cell.className = "muted";
      const empty = document.createElement("div");
      empty.className = "empty-action";
      const text = document.createElement("span");
      text.textContent = "暂无口述记录。先答当前题，再提交评分。";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "ghost-btn small";
      button.textContent = "去回答";
      button.addEventListener("click", () => focusAnswerBox(els));
      empty.append(text, button);
      cell.appendChild(empty);
      row.appendChild(cell);
      els.sessionRows.appendChild(row);
      return;
    }
    records.slice(0, 8).forEach((record) => {
      const row = document.createElement("tr");
      [record.createdAt, record.question, record.score, record.followUp].forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value || "";
        row.appendChild(cell);
      });
      els.sessionRows.appendChild(row);
    });
  }

  function setupSpeechRecognition(app, els) {
    function setVoiceStatus(text, source) {
      els.voiceStatus.textContent = source ? `语音能力：${source} · ${text}` : text;
    }

    function appendFinalText(spoken) {
      const text = String(spoken || "").trim();
      if (!text) return;
      const current = String(els.answerText.value || "").trim();
      els.answerText.value = current ? `${current}\n${text}` : text;
    }

    function setNativeButtons(state, cooldownMs = 0) {
      const listening = ["starting", "listening", "partial", "stopping"].includes(state);
      const cooling = state === "cooldown" || cooldownMs > 0;
      els.voiceStartBtn.disabled = listening || cooling;
      els.voiceStopBtn.disabled = !listening;
    }

    function startCooldownCountdown(ms, message) {
      const total = Math.max(0, Number(ms || 0));
      if (app.androidSpeechCooldownTimer) {
        window.clearInterval(app.androidSpeechCooldownTimer);
        app.androidSpeechCooldownTimer = null;
      }
      if (!total) {
        setNativeButtons("idle", 0);
        return;
      }
      const endAt = Date.now() + total;
      const render = () => {
        const left = Math.max(0, endAt - Date.now());
        if (left <= 0) {
          window.clearInterval(app.androidSpeechCooldownTimer);
          app.androidSpeechCooldownTimer = null;
          setNativeButtons("idle", 0);
          setVoiceStatus("冷却结束，可手动重试", "Android 原生语音");
          return;
        }
        setNativeButtons("cooldown", left);
        setVoiceStatus(`${message || "系统语音服务冷却中"}，${Math.ceil(left / 1000)} 秒后可重试`, "Android 原生语音");
      };
      render();
      app.androidSpeechCooldownTimer = window.setInterval(render, 1000);
    }

    function parseNativePayload(payload) {
      if (!payload) return {};
      if (typeof payload === "string") {
        try {
          return JSON.parse(payload);
        } catch (_) {
          return { message: payload };
        }
      }
      return payload;
    }

	    const nativeBridge = window.AndroidSpeech;
	    const recorderBridge = window.AndroidRecorder;
	    const hasNativeBridge = nativeBridge
	      && typeof nativeBridge.startListening === "function"
	      && typeof nativeBridge.stopListening === "function";
	    const hasRecorderBridge = recorderBridge
	      && typeof recorderBridge.startRecording === "function"
	      && typeof recorderBridge.stopAndTranscribe === "function";

	    function setupRecordUploadProvider(reason) {
	      if (!hasRecorderBridge) return false;
	      let available = true;
	      try {
	        available = typeof recorderBridge.isAvailable === "function" ? Boolean(recorderBridge.isAvailable()) : true;
	      } catch (_) {
	        available = true;
	      }
	      if (!available) return false;
	      const setRecorderButtons = (state) => {
	        const recording = state === "recording";
	        const uploading = state === "uploading";
	        els.voiceStartBtn.disabled = recording || uploading;
	        els.voiceStopBtn.disabled = !recording;
	      };
	      window.onAndroidRecordingState = (payload) => {
	        const data = parseNativePayload(payload);
	        const state = data.state;
	        const stateText = {
	          requesting_permission: "正在请求麦克风权限",
	          recording: "正在录音，说完后点击停止",
	          uploading: "正在上传转写",
	          final: "转写完成，可编辑后提交评分",
	          idle: "空闲",
	          error: "录音转写出错"
	        }[state] || data.message || state || "状态更新";
	        setRecorderButtons(state);
	        setVoiceStatus(data.message || stateText, "录音后转写");
	      };
	      window.onAndroidRecordingFinal = (payload) => {
	        const data = parseNativePayload(payload);
	        appendFinalText(data.text || "");
	        setRecorderButtons("idle");
	        setVoiceStatus(data.text ? "转写完成，已追加到我的回答" : "转写结束，但没有返回文本", "录音后转写");
	      };
	      window.onAndroidRecordingError = (payload) => {
	        const data = parseNativePayload(payload);
	        setRecorderButtons("idle");
	        setVoiceStatus(`${data.message || data.code || "录音转写失败"}。可继续手动输入。`, "录音后转写");
	      };
	      els.voiceStartBtn.disabled = false;
	      els.voiceStopBtn.disabled = true;
	      setVoiceStatus(`${reason || "系统实时识别不可用"}；已切换到录音后转写。停止后会上传服务端 ASR。`, "录音后转写");
	      els.voiceStartBtn.addEventListener("click", () => {
	        setRecorderButtons("recording");
	        setVoiceStatus("正在启动录音", "录音后转写");
	        recorderBridge.startRecording();
	      });
	      els.voiceStopBtn.addEventListener("click", () => {
	        setRecorderButtons("uploading");
	        setVoiceStatus("正在停止并上传", "录音后转写");
	        recorderBridge.stopAndTranscribe();
	      });
	      return true;
	    }

	    if (hasNativeBridge) {
	      let available = true;
      try {
        available = typeof nativeBridge.isAvailable === "function" ? Boolean(nativeBridge.isAvailable()) : true;
      } catch (_) {
        available = true;
      }
      if (available) {
        window.onAndroidSpeechAvailable = (payload) => {
          const data = parseNativePayload(payload);
          setVoiceStatus(data.message || "Android 原生语音可用", "Android 原生语音");
        };
        window.onAndroidSpeechState = (payload) => {
          const data = parseNativePayload(payload);
          const state = data.state;
          const stateText = {
            requesting_permission: "正在请求麦克风权限",
            starting: "正在启动系统语音服务",
            ready: "可以开始说话",
            listening: "正在听你回答",
            partial: "正在识别",
            stopping: "正在停止",
            final: "识别完成，可编辑后提交评分",
            idle: "空闲",
            cooldown: "冷却中",
            error: "语音出错"
          }[state] || data.message || state || "状态更新";
          if (Number(data.cooldownMs || 0) > 0 || state === "cooldown") {
            startCooldownCountdown(data.cooldownMs, data.message || stateText);
          } else {
            setNativeButtons(state, 0);
            setVoiceStatus(data.message || stateText, "Android 原生语音");
          }
        };
        window.onAndroidSpeechPartial = (payload) => {
          const data = parseNativePayload(payload);
          setNativeButtons("partial", 0);
          setVoiceStatus(data.text ? `正在识别：${data.text}` : "正在识别", "Android 原生语音");
        };
        window.onAndroidSpeechFinal = (payload) => {
          const data = parseNativePayload(payload);
          appendFinalText(data.text || "");
          setNativeButtons("idle", 0);
          setVoiceStatus(data.text ? "识别完成，已追加到我的回答" : "识别结束，但没有返回文本", "Android 原生语音");
        };
        window.onAndroidSpeechError = (payload) => {
          const data = parseNativePayload(payload);
          const cooldownMs = Number(data.cooldownMs || 0);
          if (cooldownMs > 0) {
            startCooldownCountdown(cooldownMs, data.message || data.code || "语音识别失败");
          } else {
            setNativeButtons("idle", 0);
            setVoiceStatus(`${data.message || data.code || "未知错误"}。可检查麦克风权限或系统语音服务。`, "Android 原生语音");
          }
        };
        els.voiceStartBtn.disabled = false;
        els.voiceStopBtn.disabled = true;
        setVoiceStatus("可用，点击开始语音会请求麦克风权限", "Android 原生语音");
        els.voiceStartBtn.addEventListener("click", () => {
          setNativeButtons("starting", 0);
          setVoiceStatus("启动中", "Android 原生语音");
          nativeBridge.startListening();
        });
        els.voiceStopBtn.addEventListener("click", () => {
          nativeBridge.stopListening();
        });
        return;
      }
	      if (setupRecordUploadProvider("Android 原生语音服务不可用")) {
	        return;
	      }
	      els.voiceStartBtn.disabled = true;
	      els.voiceStopBtn.disabled = true;
	      setVoiceStatus("Android 原生语音服务不可用，且录音后转写服务地址不可用；可手动输入。", "手动输入");
	      return;
	    }
	    if (setupRecordUploadProvider("Android 原生语音桥不可用")) {
	      return;
	    }

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      els.voiceStartBtn.disabled = true;
      els.voiceStopBtn.disabled = true;
      setVoiceStatus("当前浏览器没有语音能力；可手动输入。", "手动输入");
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "zh-CN";
    recognition.continuous = true;
    recognition.interimResults = true;
    app.recognition = recognition;
    let finalText = "";
    recognition.onstart = () => {
      els.voiceStartBtn.disabled = true;
      els.voiceStopBtn.disabled = false;
      setVoiceStatus("正在听你回答", "Web Speech API");
    };
    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += text;
        } else {
          interim += text;
        }
      }
      els.answerText.value = `${finalText}${interim}`;
    };
    recognition.onerror = (event) => {
      els.voiceStartBtn.disabled = false;
      els.voiceStopBtn.disabled = true;
      setVoiceStatus(`语音识别失败：${event.error}`, "Web Speech API");
    };
    recognition.onend = () => {
      els.voiceStartBtn.disabled = false;
      els.voiceStopBtn.disabled = true;
      setVoiceStatus("语音已停止，可继续编辑后提交评分", "Web Speech API");
      finalText = els.answerText.value;
    };
    els.voiceStartBtn.disabled = false;
    els.voiceStopBtn.disabled = true;
    setVoiceStatus("可用，Android App 内优先使用原生语音桥", "Web Speech API");
    els.voiceStartBtn.addEventListener("click", () => {
      finalText = els.answerText.value;
      recognition.start();
    });
    els.voiceStopBtn.addEventListener("click", () => {
      recognition.stop();
    });
  }

  function findBlockById(schedule, id) {
    if (!id) return null;
    for (const day of schedule.days) {
      const block = day.blocks.find((item) => item.id === id);
      if (block) {
        return {
          ...block,
          day,
          startDateTime: parseSgDateTime(day.date, block.start),
          endDateTime: parseSgDateTime(block.endDate || day.date, block.end)
        };
      }
    }
    return null;
  }

  let browserAppStarted = false;

  function startBrowserAppOnce() {
    if (browserAppStarted) return;
    browserAppStarted = true;
    initBrowserApp();
  }

  if (typeof window !== "undefined" && typeof document !== "undefined") {
    if (document.readyState === "loading") {
      window.addEventListener("DOMContentLoaded", startBrowserAppOnce);
    } else {
      startBrowserAppOnce();
    }
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js").catch(() => {});
      });
    }
  }

  return {
    parseSgDateTime,
    flattenBlocks,
    applyPlanDelays,
    getDatePartsInZone,
    getPlanState,
    formatDuration,
    matchesBlock,
    mergeObjectState,
    mergeArrayState,
    resolveAppPath,
    NAV_META,
    CATEGORY_META,
    viewAllowed,
    allowedNavItems,
    categoriesByGroup,
    shiftScheduleDates,
    getScheduleForSettings,
    getEffectiveNow,
    planModeLabel
  };
});
