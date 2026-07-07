use axum::{http::StatusCode, response::Response};
use serde_json::{Value, json};

use crate::AppState;
use crate::auth_config::get_auth_config;
use crate::auth_state::now_millis;
use crate::coach_invitation_routes::response_value;
use crate::coach_invitations::{
    coach_invitation_from_payload, list_coach_invitations, upsert_coach_invitation,
};
use crate::http_responses::{internal_error, json_response};

pub(crate) async fn import_coach_invitations_response(
    state: &AppState,
    payload: &Value,
) -> Response {
    let records = payload
        .get("records")
        .or_else(|| payload.get("invitations"))
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    if records.is_empty() || records.len() > 50 {
        return import_response(
            state,
            0,
            if records.is_empty() {
                1
            } else {
                records.len() as i64 - 50
            },
            if records.is_empty() {
                "批量导入至少需要 1 条邀请记录。".to_string()
            } else {
                "单次批量导入最多支持 50 条邀请记录。".to_string()
            },
            StatusCode::BAD_REQUEST,
        )
        .await;
    }
    let mut imported_count = 0;
    for (index, record) in records.iter().enumerate() {
        let invitation = match coach_invitation_from_payload(
            format!("coach-invite-bulk-{}-{}", now_millis(), index),
            record,
        ) {
            Ok(value) => value,
            Err(error) => {
                let message = error
                    .get("message")
                    .and_then(Value::as_str)
                    .unwrap_or("邀请记录无效。");
                return import_response(
                    state,
                    0,
                    1,
                    format!("第 {} 条邀请记录无效：{}", index + 1, message),
                    StatusCode::BAD_REQUEST,
                )
                .await;
            }
        };
        if let Err(error) = upsert_coach_invitation(&state.db, &invitation).await {
            return internal_error(error);
        }
        imported_count += 1;
    }
    import_response(
        state,
        imported_count,
        0,
        format!("已批量导入 {imported_count} 条邀请记录；不会自动创建登录账号。"),
        StatusCode::OK,
    )
    .await
}

async fn import_response(
    state: &AppState,
    imported_count: i64,
    rejected_count: i64,
    message: String,
    code: StatusCode,
) -> Response {
    let mut response = match list_coach_invitations(&state.db)
        .await
        .map(|invitations| response_value(&get_auth_config().users, invitations))
        .map_err(internal_error)
    {
        Ok(value) => value,
        Err(response) => return response,
    };
    response["importAction"] = json!({
        "status": if imported_count > 0 { "PASS" } else { "USER_ACTION_REQUIRED" },
        "importedCount": imported_count,
        "rejectedCount": rejected_count,
        "message": message
    });
    json_response(code, response)
}
