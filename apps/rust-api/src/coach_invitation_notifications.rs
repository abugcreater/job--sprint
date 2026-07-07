use serde_json::{Value, json};

pub(crate) fn invitation_notification_action(
    configured_users: &[Value],
    invitations: &[Value],
    payload: &Value,
) -> Value {
    let channel = match text(payload, "channel").as_str() {
        "email" => "email".to_string(),
        "im" => "im".to_string(),
        "manual" => "manual".to_string(),
        _ => "manual".to_string(),
    };
    let invite_batch = text(payload, "inviteBatch");
    let requested_usernames = string_array(payload, "usernames");
    let login_url = login_url(payload);
    let mut notifications = Vec::new();
    let mut skipped_users = Vec::new();
    let selected_users: Vec<Value> = configured_users
        .iter()
        .filter(|user| {
            let username = text(user, "username");
            if username.is_empty() {
                return false;
            }
            if !requested_usernames.is_empty() {
                return requested_usernames.contains(&username);
            }
            !invite_batch.is_empty() && text(user, "inviteBatch") == invite_batch
        })
        .cloned()
        .collect();
    for user in &selected_users {
        let username = text(user, "username");
        if user
            .get("disabled")
            .and_then(Value::as_bool)
            .unwrap_or(false)
            || user
                .get("canLogin")
                .and_then(Value::as_bool)
                .map(|value| !value)
                .unwrap_or(false)
        {
            skipped_users.push(json!({"username": username, "reason": "account_not_loginable"}));
            continue;
        }
        let invitation = invitations
            .iter()
            .find(|item| text(item, "username") == username)
            .cloned()
            .unwrap_or_else(|| json!({}));
        notifications.push(notification_for_user(
            user,
            &invitation,
            &channel,
            &login_url,
        ));
    }
    for username in requested_usernames.iter().filter(|username| {
        !selected_users
            .iter()
            .any(|user| text(user, "username") == **username)
    }) {
        skipped_users.push(json!({"username": username, "reason": "not_configured"}));
    }
    let generated_count = notifications.len();
    json!({
        "status": if generated_count > 0 { "PASS" } else { "USER_ACTION_REQUIRED" },
        "channel": channel,
        "inviteBatch": if invite_batch.is_empty() { Value::Null } else { Value::String(invite_batch) },
        "loginUrl": login_url,
        "generatedCount": generated_count,
        "skippedCount": skipped_users.len(),
        "skippedUsers": skipped_users,
        "notifications": notifications,
        "message": if generated_count > 0 {
            format!("已生成 {generated_count} 条{}邀请通知草稿；密码需通过单独安全渠道发送。", channel_label(&channel))
        } else {
            "没有可生成通知的可登录账号。".to_string()
        }
    })
}

fn notification_for_user(
    user: &Value,
    invitation: &Value,
    channel: &str,
    login_url: &str,
) -> Value {
    let username = text(user, "username");
    let display_name = optional_text(user, "displayName").unwrap_or_else(|| username.clone());
    let invite_batch = optional_text(user, "inviteBatch")
        .or_else(|| optional_text(invitation, "inviteBatch"))
        .unwrap_or_else(|| "default".to_string());
    let target_role =
        optional_text(invitation, "targetRole").unwrap_or_else(|| "目标岗位待确认".to_string());
    let role_family = optional_text(invitation, "roleFamily")
        .or_else(|| optional_text(user, "role"))
        .unwrap_or_else(|| "泛 IT".to_string());
    let body = [
        format!("{display_name}，你的 Job Sprint AI 求职教练试用账号已准备好。"),
        format!("登录名：{username}"),
        format!("入口：{login_url}"),
        format!("批次：{invite_batch}"),
        format!("目标岗位：{target_role}"),
        "首登建议：先补画像，粘贴 JD/简历/面试反馈，采纳 3 条知识边界，再生成第一条 AI 草稿。"
            .to_string(),
        "密码请通过单独安全渠道接收，不会出现在这条通知里。".to_string(),
    ]
    .join("\n");
    json!({
        "username": username,
        "displayName": display_name,
        "dataScope": optional_text(user, "dataScope").unwrap_or_else(|| text(user, "username")),
        "inviteBatch": invite_batch,
        "roleFamily": role_family,
        "targetRole": target_role,
        "channel": channel,
        "title": format!("Job Sprint 试用入口：{display_name}"),
        "body": body,
        "loginUrl": login_url,
        "status": "draft",
        "generatedAt": chrono::Utc::now().to_rfc3339()
    })
}

fn login_url(payload: &Value) -> String {
    if let Some(value) = optional_text(payload, "loginUrl") {
        return value;
    }
    if let Some(value) = optional_text(payload, "baseUrl") {
        return format!(
            "{}/job-sprint/react/index.html",
            value.trim_end_matches('/')
        );
    }
    "/job-sprint/react/index.html".to_string()
}

fn channel_label(channel: &str) -> &'static str {
    match channel {
        "email" => "邮件",
        "im" => "IM",
        _ => "手动",
    }
}

fn string_array(payload: &Value, field: &str) -> Vec<String> {
    payload
        .get(field)
        .and_then(Value::as_array)
        .map(|items| {
            items
                .iter()
                .filter_map(Value::as_str)
                .map(str::trim)
                .filter(|item| !item.is_empty())
                .map(str::to_string)
                .collect()
        })
        .unwrap_or_default()
}

fn optional_text(payload: &Value, field: &str) -> Option<String> {
    payload
        .get(field)
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
}

fn text(payload: &Value, field: &str) -> String {
    optional_text(payload, field).unwrap_or_default()
}
