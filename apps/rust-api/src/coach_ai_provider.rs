use serde_json::{Value, json};
use std::{env, time::Instant};

use crate::coach_ai_provider_format::{clip, provider_request, response_from_provider};
use crate::coach_ai_tools::coach_artifacts_payload;

struct ProviderConfig {
    base_url: Option<String>,
    token: Option<String>,
    model: String,
    timeout_ms: u64,
}

pub(crate) async fn generate_coach_artifacts_payload(
    payload: &Value,
    generated_prefix: String,
) -> Result<Value, Value> {
    let config = ProviderConfig::from_env();
    let provider_requested = config.base_url.is_some() || config.token.is_some();
    let mut fallback =
        coach_artifacts_payload(payload, generated_prefix.clone(), provider_requested)?;
    if !config.is_complete() {
        if provider_requested {
            fallback["warning"] = json!("ai_generation_fallback");
            fallback["error"] = json!("provider_config_incomplete");
        }
        return Ok(fallback);
    }

    match call_provider(payload, generated_prefix, &config).await {
        Ok(response) => Ok(response),
        Err(error) => {
            fallback["warning"] = json!("ai_generation_fallback");
            fallback["error"] = json!(error);
            Ok(fallback)
        }
    }
}

impl ProviderConfig {
    fn from_env() -> Self {
        Self {
            base_url: env::var("ANTHROPIC_BASE_URL")
                .ok()
                .filter(|value| !value.is_empty()),
            token: env::var("ANTHROPIC_AUTH_TOKEN")
                .ok()
                .filter(|value| !value.is_empty()),
            model: env::var("ANTHROPIC_MODEL")
                .unwrap_or_else(|_| "claude-3-5-sonnet-20241022".to_string()),
            timeout_ms: env::var("AI_PROVIDER_TIMEOUT_MS")
                .ok()
                .and_then(|value| value.parse::<u64>().ok())
                .unwrap_or(12_000)
                .clamp(500, 60_000),
        }
    }

    fn is_complete(&self) -> bool {
        self.base_url.is_some() && self.token.is_some()
    }
}

async fn call_provider(
    payload: &Value,
    generated_prefix: String,
    config: &ProviderConfig,
) -> Result<Value, String> {
    let start = Instant::now();
    let endpoint = format!(
        "{}/v1/messages",
        config
            .base_url
            .as_deref()
            .unwrap_or("")
            .trim_end_matches('/')
    );
    let response = reqwest::Client::builder()
        .timeout(std::time::Duration::from_millis(config.timeout_ms))
        .build()
        .map_err(|error| format!("provider_client_error: {error}"))?
        .post(endpoint)
        .header("content-type", "application/json")
        .header("x-api-key", config.token.as_deref().unwrap_or(""))
        .header(
            "authorization",
            format!("Bearer {}", config.token.as_deref().unwrap_or("")),
        )
        .header("anthropic-version", "2023-06-01")
        .json(&provider_request(payload, &config.model))
        .send()
        .await
        .map_err(|error| format!("provider_request_failed: {error}"))?;
    let status = response.status();
    if !status.is_success() {
        let text = response.text().await.unwrap_or_default();
        return Err(format!(
            "provider_http_{}: {}",
            status.as_u16(),
            clip(&text, 160)
        ));
    }
    let data = response
        .json::<Value>()
        .await
        .map_err(|error| format!("provider_json_error: {error}"))?;
    response_from_provider(
        payload,
        generated_prefix,
        &config.model,
        data,
        start.elapsed().as_millis(),
    )
}
