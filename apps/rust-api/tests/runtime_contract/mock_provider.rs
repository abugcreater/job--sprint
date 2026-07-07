use serde_json::json;
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    net::TcpListener,
};

pub(crate) async fn start_mock_anthropic_provider() -> String {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        loop {
            let Ok((mut stream, _)) = listener.accept().await else {
                break;
            };
            tokio::spawn(async move {
                let mut buffer = [0_u8; 4096];
                let _ = stream.read(&mut buffer).await;
                let text = json!({
                    "artifacts": [{
                        "type": "knowledge_card",
                        "title": "客户现场问题闭环表达卡",
                        "body": "先讲现场约束，再讲定位链路、复盘证据和下一步动作。",
                        "reason": "来自知识边界：客户现场问题闭环。",
                        "sources": ["画像：实施工程师", "知识边界：客户现场问题闭环"],
                        "confidence": "high",
                        "targetDate": "2026-07-06"
                    }]
                })
                .to_string();
                let body = json!({
                    "content": [{ "type": "text", "text": text }],
                    "usage": { "input_tokens": 111, "output_tokens": 222 }
                })
                .to_string();
                let response = format!(
                    "HTTP/1.1 200 OK\r\ncontent-type: application/json\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{}",
                    body.len(),
                    body
                );
                let _ = stream.write_all(response.as_bytes()).await;
            });
        }
    });
    format!("http://{addr}")
}
