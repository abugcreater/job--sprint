use axum::{
    Router,
    routing::{delete, get, post, put},
};
mod ai_routes;
mod ai_tools;
mod ai_transcribe;
mod app_bootstrap;
mod app_schema;
mod app_schema_boundary_feedback;
mod application_routes;
mod auth_account_actions;
mod auth_account_batch_actions;
mod auth_account_store;
mod auth_account_users_file;
mod auth_bearer;
mod auth_config;
mod auth_hash;
mod auth_http;
mod auth_permissions;
mod auth_routes;
mod auth_state;
mod auth_tokens;
mod auth_users;
mod auth_values;
mod coach_ai_metadata;
mod coach_ai_provider;
mod coach_ai_provider_format;
mod coach_ai_tools;
#[cfg(test)]
mod coach_ai_tools_tests;
mod coach_boundary_feedback;
mod coach_boundary_feedback_summary;
mod coach_boundary_provider;
mod coach_boundary_routes;
mod coach_boundary_suggestions;
mod coach_invitation_action_routes;
mod coach_invitation_import_routes;
mod coach_invitation_notifications;
mod coach_invitation_routes;
mod coach_invitations;
mod coach_jd_insights;
mod coach_onboarding_event_summary;
mod coach_onboarding_events;
mod coach_onboarding_report;
mod coach_onboarding_routes;
mod coach_opportunity_signal_parse;
mod coach_opportunity_signals;
mod coach_outcomes;
mod coach_role_playbook;
mod data_routes;
mod health_routes;
mod http_responses;
mod interview_mistake_routes;
mod json_body;
mod llm_feedback;
mod llm_feedback_summary;
mod llm_runs;
mod login_rate;
mod runtime_records;
mod runtime_routes;
mod runtime_store;
mod session_token;
mod static_files;
mod static_routes;

pub(crate) use app_bootstrap::AppState;
pub use app_bootstrap::{build_app_from_env, serve_from_env};
pub(crate) use json_body::parse_json_body;

pub(crate) fn api_routes() -> Router<AppState> {
    Router::new()
        .route("/api/health", get(health_routes::health))
        .route("/api/auth/session", get(auth_routes::session))
        .route("/api/auth/login", post(auth_routes::login))
        .route("/api/auth/logout", post(auth_routes::logout))
        .route(
            "/api/runtime",
            get(runtime_routes::get_runtime).post(runtime_routes::post_runtime),
        )
        .route(
            "/api/progress",
            get(runtime_routes::get_progress).post(runtime_routes::post_progress),
        )
        .route(
            "/api/reviews",
            get(runtime_routes::get_reviews).post(runtime_routes::post_reviews),
        )
        .route(
            "/api/applications",
            get(data_routes::get_applications).post(data_routes::post_applications),
        )
        .route(
            "/api/applications/{id}",
            put(data_routes::update_application).delete(data_routes::delete_application),
        )
        .route(
            "/api/interview-mistakes",
            get(data_routes::get_interview_mistakes).post(data_routes::post_interview_mistakes),
        )
        .route(
            "/api/interview-mistakes/{id}",
            delete(data_routes::delete_interview_mistake),
        )
        .route("/api/score-answer", post(ai_routes::score_answer))
        .route("/api/generate-kb", post(ai_routes::generate_kb))
        .route(
            "/api/coach/artifacts",
            post(ai_routes::generate_coach_artifacts),
        )
        .route(
            "/api/coach/boundary-suggestions",
            post(coach_boundary_routes::generate_boundary_suggestions),
        )
        .route(
            "/api/coach/boundary-feedback",
            get(coach_boundary_routes::get_boundary_feedback)
                .post(coach_boundary_routes::record_boundary_feedback),
        )
        .route("/api/coach/llm-runs", get(ai_routes::get_coach_llm_runs))
        .route(
            "/api/coach/feedback",
            get(ai_routes::get_coach_feedback).post(ai_routes::record_coach_feedback),
        )
        .route(
            "/api/coach/outcomes",
            get(coach_outcomes::get_coach_outcomes).post(coach_outcomes::record_coach_outcome),
        )
        .route(
            "/api/coach/onboarding-events",
            get(coach_onboarding_routes::get_coach_onboarding_events)
                .post(coach_onboarding_routes::record_coach_onboarding_event),
        )
        .route(
            "/api/coach/onboarding-report",
            get(coach_onboarding_routes::get_coach_onboarding_report),
        )
        .route(
            "/api/coach/invitations",
            get(coach_invitation_routes::get_coach_invitations)
                .post(coach_invitation_routes::record_coach_invitation)
                .delete(coach_invitation_action_routes::delete_coach_invitation_route),
        )
        .route("/api/transcribe", post(ai_routes::transcribe))
        .fallback(static_routes::static_or_api_not_found)
}
