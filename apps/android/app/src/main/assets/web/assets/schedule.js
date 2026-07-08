(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.ScheduleApp = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const NAV_META = [
    { id: "today", label: "今日", permission: "module:today" },
    { id: "coach", label: "画像", permission: "module:coach" },
    { id: "learn", label: "知识", permission: "module:learn" },
    { id: "interview", label: "面试", permission: "module:interview" },
    { id: "applications", label: "机会", permission: "module:applications" },
    { id: "review", label: "复盘", permission: "module:review" }
  ];

  const CATEGORY_META = {
    project: { label: "个人任务", group: "primary", showInMainFilter: true, order: 10 },
    interview: { label: "面试", group: "primary", showInMainFilter: true, order: 20 },
    delivery: { label: "机会", group: "primary", showInMainFilter: true, order: 30 },
    review: { label: "复盘", group: "primary", showInMainFilter: true, order: 40 },
    rest: { label: "恢复", group: "secondary", showInMainFilter: false, order: 50 }
  };

  function flattenBlocks(schedule) {
    if (!schedule || !Array.isArray(schedule.days)) return [];
    return schedule.days.flatMap((day, dayIndex) =>
      Array.isArray(day.blocks)
        ? day.blocks.map((block, blockIndex) => ({ ...block, day, dayIndex, blockIndex }))
        : []
    );
  }

  function getPlanState(schedule, now = new Date()) {
    const blocks = flattenBlocks(schedule);
    if (!blocks.length) {
      return {
        status: "等待导入画像",
        current: null,
        next: null,
        today: null,
        blocks,
        now
      };
    }
    return {
      status: "请使用 React 画像日历",
      current: null,
      next: blocks[0] || null,
      today: null,
      blocks,
      now
    };
  }

  function applyPlanDelays(schedule) {
    return schedule;
  }

  function formatDuration(ms) {
    const totalMinutes = Math.max(0, Math.round(Number(ms) / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours && minutes) return `${hours}小时 ${minutes}分钟`;
    if (hours) return `${hours}小时`;
    return `${minutes}分钟`;
  }

  function mergeObjectState(serverValue = {}, localValue = {}) {
    return { ...serverValue, ...localValue };
  }

  function mergeArrayState(serverValue = [], localValue = []) {
    const merged = new Map();
    for (const item of serverValue) {
      if (item && item.id) merged.set(item.id, item);
    }
    for (const item of localValue) {
      if (item && item.id) merged.set(item.id, item);
    }
    return Array.from(merged.values());
  }

  function viewAllowed(app, viewId) {
    const permissions = app && app.authState && app.authState.user && app.authState.user.permissions;
    if (!Array.isArray(permissions) || permissions.includes("*")) return true;
    const target = NAV_META.find((item) => item.id === viewId);
    return Boolean(target && permissions.includes(target.permission));
  }

  function allowedNavItems(app) {
    return NAV_META.filter((item) => viewAllowed(app, item.id));
  }

  function reactTodayPath(locationLike) {
    const pathname = locationLike && typeof locationLike.pathname === "string" ? locationLike.pathname : "";
    return pathname.includes("/web/") ? "../react/index.html#/today" : "./react/index.html#/today";
  }

  function init() {
    if (typeof window !== "undefined" && window.location && !window.location.pathname.includes("/react/")) {
      window.location.replace(reactTodayPath(window.location));
    }
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  }

  return {
    NAV_META,
    CATEGORY_META,
    allowedNavItems,
    applyPlanDelays,
    flattenBlocks,
    formatDuration,
    getPlanState,
    mergeArrayState,
    mergeObjectState,
    reactTodayPath,
    viewAllowed
  };
});
