const VALID_CHANNELS = new Set(["email", "im", "manual"]);

function buildInvitationNotificationAction(configuredUsers, invitations, payload) {
  const channel = VALID_CHANNELS.has(text(payload, "channel")) ? text(payload, "channel") : "manual";
  const inviteBatch = text(payload, "inviteBatch");
  const requestedUsernames = Array.isArray(payload?.usernames)
    ? payload.usernames.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
  const loginUrl = loginUrlFromPayload(payload);
  const invitationByUsername = new Map(
    (Array.isArray(invitations) ? invitations : []).map((invitation) => [text(invitation, "username"), invitation])
  );
  const selectedUsers = (Array.isArray(configuredUsers) ? configuredUsers : []).filter((user) => {
    const username = text(user, "username");
    if (!username) return false;
    if (requestedUsernames.length > 0) return requestedUsernames.includes(username);
    return inviteBatch && text(user, "inviteBatch") === inviteBatch;
  });
  const notifications = [];
  const skippedUsers = [];
  for (const user of selectedUsers) {
    const username = text(user, "username");
    if (user.disabled || user.canLogin === false) {
      skippedUsers.push({ username, reason: "account_not_loginable" });
      continue;
    }
    const invitation = invitationByUsername.get(username) || {};
    notifications.push(notificationForUser(user, invitation, { channel, loginUrl }));
  }
  const missingUsers = requestedUsernames.filter((username) => !selectedUsers.some((user) => text(user, "username") === username));
  for (const username of missingUsers) {
    skippedUsers.push({ username, reason: "not_configured" });
  }
  return {
    status: notifications.length > 0 ? "PASS" : "USER_ACTION_REQUIRED",
    channel,
    inviteBatch: inviteBatch || null,
    loginUrl,
    generatedCount: notifications.length,
    skippedCount: skippedUsers.length,
    skippedUsers,
    notifications,
    message: notifications.length > 0
      ? `已生成 ${notifications.length} 条${channelLabel(channel)}邀请通知草稿；密码需通过单独安全渠道发送。`
      : "没有可生成通知的可登录账号。"
  };
}

function notificationForUser(user, invitation, options) {
  const username = text(user, "username");
  const displayName = text(user, "displayName") || username;
  const inviteBatch = text(user, "inviteBatch") || text(invitation, "inviteBatch") || "default";
  const targetRole = text(invitation, "targetRole") || "目标岗位待确认";
  const roleFamily = text(invitation, "roleFamily") || text(user, "role") || "泛 IT";
  const body = [
    `${displayName}，你的 Job Sprint AI 求职教练试用账号已准备好。`,
    `登录名：${username}`,
    `入口：${options.loginUrl}`,
    `批次：${inviteBatch}`,
    `目标岗位：${targetRole}`,
    `首登建议：先补画像，粘贴 JD/简历/面试反馈，采纳 3 条知识边界，再生成第一条 AI 草稿。`,
    "密码请通过单独安全渠道接收，不会出现在这条通知里。"
  ].join("\n");
  return {
    username,
    displayName,
    dataScope: text(user, "dataScope") || username,
    inviteBatch,
    roleFamily,
    targetRole,
    channel: options.channel,
    title: `Job Sprint 试用入口：${displayName}`,
    body,
    loginUrl: options.loginUrl,
    status: "draft",
    generatedAt: new Date().toISOString()
  };
}

function loginUrlFromPayload(payload) {
  const explicitLoginUrl = text(payload, "loginUrl");
  if (explicitLoginUrl) return explicitLoginUrl;
  const baseUrl = text(payload, "baseUrl").replace(/\/+$/, "");
  if (baseUrl) return `${baseUrl}/job-sprint/react/index.html`;
  return "/job-sprint/react/index.html";
}

function channelLabel(channel) {
  if (channel === "email") return "邮件";
  if (channel === "im") return "IM";
  return "手动";
}

function text(source, field) {
  return source && typeof source[field] === "string" ? source[field].trim() : "";
}

module.exports = {
  buildInvitationNotificationAction
};
