function usersConfigWithAudit(existingConfig, users, accountAuditEvents) {
  return {
    ...(existingConfig.wasArray ? {} : existingConfig.raw),
    users,
    accountAuditEvents
  };
}

function appendAccountAuditEvent(existingEvents, event) {
  const createdAt = new Date().toISOString();
  const action = text(event, "action");
  const username = text(event, "username");
  const affectedUsernames = Array.isArray(event.affectedUsernames)
    ? event.affectedUsernames.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 100)
    : username ? [username] : [];
  const nextEvent = {
    id: `account-audit-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt,
    actorUsername: text(event, "actorUsername") || "system",
    action,
    username,
    role: text(event, "role"),
    dataScope: text(event, "dataScope") || username,
    inviteBatch: text(event, "inviteBatch") || "default",
    affectedUsernames,
    affectedCount: numberValue(event.affectedCount, affectedUsernames.length),
    requestedCount: numberValue(event.requestedCount, affectedUsernames.length),
    skippedCount: numberValue(event.skippedCount, 0),
    skippedUsers: normalizeSkippedUsers(event.skippedUsers),
    message: text(event, "message")
  };
  return [nextEvent, ...normalizeAccountAuditEvents(existingEvents)].slice(0, 100);
}

function normalizeAccountAuditEvents(value) {
  return Array.isArray(value)
    ? value
      .filter((item) => item && typeof item === "object" && text(item, "action"))
      .map((item) => {
        const username = text(item, "username");
        const affectedUsernames = Array.isArray(item.affectedUsernames)
          ? item.affectedUsernames.map((value) => String(value || "").trim()).filter(Boolean).slice(0, 100)
          : username ? [username] : [];
        return {
          id: text(item, "id") || `account-audit-${text(item, "action")}-${username || "batch"}`,
          createdAt: text(item, "createdAt"),
          actorUsername: text(item, "actorUsername") || "system",
          action: text(item, "action"),
          username,
          role: text(item, "role"),
          dataScope: text(item, "dataScope") || username,
          inviteBatch: text(item, "inviteBatch") || "default",
          affectedUsernames,
          affectedCount: numberValue(item.affectedCount, affectedUsernames.length),
          requestedCount: numberValue(item.requestedCount, affectedUsernames.length),
          skippedCount: numberValue(item.skippedCount, 0),
          skippedUsers: normalizeSkippedUsers(item.skippedUsers),
          message: text(item, "message")
        };
      })
      .slice(0, 100)
    : [];
}

function normalizeSkippedUsers(value) {
  return Array.isArray(value)
    ? value
      .map((item) => ({ username: text(item, "username"), reason: text(item, "reason") || "skipped" }))
      .filter((item) => item.username)
      .slice(0, 100)
    : [];
}

function numberValue(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function text(source, field) {
  return source && typeof source[field] === "string" ? source[field].trim() : "";
}

module.exports = {
  appendAccountAuditEvent,
  normalizeAccountAuditEvents,
  usersConfigWithAudit
};
