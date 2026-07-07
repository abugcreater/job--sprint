#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    job_sprint_rust_api::serve_from_env().await
}
