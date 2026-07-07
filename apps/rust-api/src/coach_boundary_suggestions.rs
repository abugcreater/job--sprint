use serde_json::{Value, json};

pub(crate) const PROMPT_VERSION: &str = "coach-boundary-suggestions-v1";
pub(crate) const SCHEMA_VERSION: &str = "coach-boundary-suggestion-list-v1";

pub(crate) fn boundary_suggestions_payload(
    payload: &Value,
    generated_prefix: String,
) -> Result<Value, Value> {
    let Some(profile) = payload.get("profile").and_then(Value::as_object) else {
        return Err(error_payload(
            "profile_required",
            "请先保存一个目标画像，再提取知识边界。",
        ));
    };
    let profile_id = string_or(profile.get("id"), "");
    if profile_id.is_empty() {
        return Err(error_payload(
            "profile_required",
            "请先保存一个目标画像，再提取知识边界。",
        ));
    }
    let text = string_or(
        payload.get("text").or_else(|| payload.get("sourceText")),
        "",
    );
    if text.chars().count() < 12 {
        return Err(error_payload(
            "source_text_required",
            "请粘贴 JD、简历片段或面试反馈。",
        ));
    }
    let role_family = string_or(profile.get("roleFamily"), "other");
    let target_role = string_or(profile.get("targetRole"), "目标岗位");
    let existing = payload
        .get("knowledgeBoundaries")
        .and_then(Value::as_array)
        .map(|items| {
            items
                .iter()
                .map(|item| string_or(item.get("topic"), "").to_lowercase())
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();
    let suggestions = extract_topics(&text, &role_family)
        .into_iter()
        .filter(|topic| !existing.contains(&topic.to_lowercase()))
        .take(4)
        .enumerate()
        .map(|(index, topic)| suggestion(&generated_prefix, index, &topic, &text, &target_role))
        .collect::<Vec<_>>();
    Ok(json!({
        "provider": "local-fallback",
        "promptVersion": PROMPT_VERSION,
        "schemaVersion": SCHEMA_VERSION,
        "inputSummaryHash": hash_summary(&format!("{profile_id}|{role_family}|{target_role}|{text}")),
        "suggestions": suggestions
    }))
}

fn suggestion(prefix: &str, index: usize, topic: &str, text: &str, target_role: &str) -> Value {
    json!({
        "id": format!("{prefix}-{index}"),
        "topic": topic,
        "level": infer_level(text),
        "gap": infer_gap(text, topic),
        "evidence": infer_evidence(text, topic),
        "targetUse": format!("{target_role}：{}", infer_target_use(text, topic)),
        "sourceSummary": text.chars().take(120).collect::<String>(),
        "confidence": if index == 0 { "high" } else { "medium" }
    })
}

fn extract_topics(text: &str, role_family: &str) -> Vec<String> {
    let mut topics = role_topics(role_family);
    topics.extend(common_topics());
    topics.extend(role_topics("other"));
    let mut hits = topics
        .into_iter()
        .filter(|term| text.to_lowercase().contains(&term.to_lowercase()))
        .collect::<Vec<_>>();
    hits.sort();
    hits.dedup();
    if hits.is_empty() {
        vec![
            text.chars()
                .take(18)
                .collect::<String>()
                .trim_matches(['，', '。', '；', ',', '.'])
                .to_string(),
        ]
    } else {
        hits
    }
}

fn common_topics() -> Vec<String> {
    words("MQ Redis Spring JVM 事务 稳定性 高并发 缓存 分布式 RAG Agent AI K8s Docker MySQL Dubbo")
}

fn role_topics(role_family: &str) -> Vec<String> {
    match role_family {
        "backend" => words("MQ Redis Spring JVM 事务 稳定性 高并发 缓存 分布式"),
        "frontend" => words("性能 组件 状态管理 工程化 首屏 发布 兼容性"),
        "qa" => words("接口自动化 测试分层 质量指标 稳定性 缺陷归因 Mock"),
        "ops" => words("监控 告警 发布 回滚 故障恢复 容量 变更"),
        "data" => words("指标口径 数据链路 血缘 质量校验 报表 治理"),
        "mobile" => words("性能 崩溃率 生命周期 灰度 兼容性 端上体验"),
        "product" => words("用户问题 指标 需求取舍 上线复盘 增长 留存"),
        "project" => words("里程碑 风险台账 跨团队协作 验收 资源协调"),
        "implementation" => words("客户现场 配置交付 问题闭环 验收 SOP"),
        "support" => words("工单 排查路径 客户沟通 知识沉淀 日志"),
        _ => words("目标岗位 项目证据 风险边界 交付场景"),
    }
}

fn infer_level(text: &str) -> &'static str {
    if contains_any(text, &["不了解", "陌生", "没做过", "不会"]) {
        "陌生"
    } else if contains_any(text, &["可落地", "实战", "线上", "主导"]) {
        "可讲"
    } else {
        "了解"
    }
}

fn infer_gap(text: &str, topic: &str) -> String {
    if contains_any(text, &["故障", "恢复", "排查", "稳定性"]) {
        format!("围绕「{topic}」补齐故障场景、恢复动作和线上证据。")
    } else if contains_any(text, &["指标", "量化", "数据", "报表"]) {
        format!("围绕「{topic}」补齐指标口径、前后变化和可验证证据。")
    } else {
        format!("围绕「{topic}」补齐机制、边界、项目证据和不能夸大的部分。")
    }
}

fn infer_evidence(text: &str, topic: &str) -> String {
    let marker = [
        "项目", "系统", "平台", "链路", "报表", "复盘", "工单", "日志",
    ]
    .iter()
    .find(|marker| text.contains(**marker));
    marker
        .map(|item| format!("{item}相关材料需整理为「{topic}」证据。"))
        .unwrap_or_else(|| format!("待补充「{topic}」相关项目、笔记或复盘证据。"))
}

fn infer_target_use(text: &str, topic: &str) -> String {
    if contains_any(text, &["JD", "岗位", "招聘", "职责"]) {
        format!("用于匹配 JD 中的「{topic}」要求")
    } else if contains_any(text, &["面试", "追问", "反馈"]) {
        format!("用于回答面试追问中的「{topic}」问题")
    } else {
        format!("用于目标岗位下的「{topic}」表达")
    }
}

fn error_payload(error: &str, message: &str) -> Value {
    json!({ "ok": false, "error": error, "message": message, "provider": "local-fallback", "promptVersion": PROMPT_VERSION, "schemaVersion": SCHEMA_VERSION, "suggestions": [] })
}

fn contains_any(text: &str, terms: &[&str]) -> bool {
    terms.iter().any(|term| text.contains(term))
}

fn words(value: &str) -> Vec<String> {
    value.split_whitespace().map(ToString::to_string).collect()
}

fn string_or(value: Option<&Value>, fallback: &str) -> String {
    value
        .and_then(Value::as_str)
        .unwrap_or(fallback)
        .trim()
        .replace(char::is_whitespace, " ")
}

fn hash_summary(value: &str) -> String {
    let mut hash: u32 = 0x811c9dc5;
    for byte in value.as_bytes() {
        hash ^= u32::from(*byte);
        hash = hash.wrapping_mul(0x01000193);
    }
    format!("{hash:08x}")
}
