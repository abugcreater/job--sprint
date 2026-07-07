use axum::http::StatusCode;
use serde_json::{Value, json};

pub(crate) fn score_answer_payload(payload: &Value) -> Result<Value, (StatusCode, Value)> {
    if !payload.get("question").is_some_and(Value::is_string)
        || !payload.get("answer").is_some_and(Value::is_string)
    {
        return Err((
            StatusCode::BAD_REQUEST,
            json!({ "error": "question and answer are required" }),
        ));
    }
    let answer_len = payload
        .get("answer")
        .and_then(Value::as_str)
        .unwrap_or("")
        .chars()
        .count();
    let score = (answer_len / 8).clamp(10, 82);
    Ok(json!({
        "provider": "local-fallback",
        "score": score,
        "level": if score >= 70 { "可用，但还要压实证据" } else { "基本能接，需要补链路" },
        "strengths": ["至少完成了第一版回答"],
        "weaknesses": ["请补充真实项目证据和边界说明"],
        "rewrite": "建议按“背景 -> 我的职责 -> 关键链路 -> 异常/边界 -> Java 映射”重答。",
        "followUp": "请补充一个真实项目证据：文件、链路、指标或排查命令任选一个。",
        "raw": null
    }))
}

pub(crate) fn generate_kb_payload(
    payload: &Value,
    generated_id: String,
    anthropic_base_configured: bool,
) -> Value {
    let topic = payload
        .get("topic")
        .and_then(Value::as_str)
        .unwrap_or("当前任务");
    let mut response = json!({
        "provider": "local-fallback",
        "entries": [
            {
                "id": generated_id,
                "category": "动态生成 · Java 项目深挖",
                "title": format!("{topic}：项目链路追问"),
                "publicSummary": "根据高级 Java 后端背景生成，要求回答真实职责、链路证据、异常分支和边界。",
                "interviewQuestion": format!("围绕“{topic}”，请讲清你的职责边界、核心链路、异常分支和可证明证据。"),
                "answer60s": "按背景、职责、链路、异常/边界、Java 映射回答。",
                "answer3min": "展开入口、服务编排、缓存/MQ/DB、观测与复盘。",
                "javaMapping": "高级 Java 后端、复杂业务链路、稳定性治理",
                "projectEvidence": "绑定真实搜索链路、Spring/JVM/MQ/Redis 或 AI 工程化增强项目证据。",
                "risk": "不要把团队成果或生产化设想说成个人已完整落地。",
                "doNotSay": ["全链路都是我一个人负责"],
                "safeWording": ["我负责边界清晰模块，并参与链路治理"]
            }
        ]
    });
    if anthropic_base_configured {
        response["warning"] = json!("ai_generation_fallback");
    }
    response
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn score_answer_payload_requires_question_and_answer() {
        assert!(score_answer_payload(&json!({ "question": "q" })).is_err());

        let payload = score_answer_payload(&json!({
            "question": "q",
            "answer": "a".repeat(640)
        }))
        .expect("score payload");

        assert_eq!(
            payload.get("provider").and_then(Value::as_str),
            Some("local-fallback")
        );
        assert_eq!(payload.get("score").and_then(Value::as_i64), Some(80));
    }

    #[test]
    fn generate_kb_payload_marks_provider_fallback_warning() {
        let payload = generate_kb_payload(
            &json!({ "topic": "缓存击穿" }),
            "generated-test".to_string(),
            true,
        );

        assert_eq!(
            payload.get("warning").and_then(Value::as_str),
            Some("ai_generation_fallback")
        );
        assert_eq!(
            payload["entries"][0].get("id").and_then(Value::as_str),
            Some("generated-test")
        );
    }
}
