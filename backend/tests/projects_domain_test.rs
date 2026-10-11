use axum::{
    body::{to_bytes, Body},
    http::{header, Request, StatusCode},
};
use productive_timer_backend::{create_app, db, AppState};
use tower::ServiceExt;

#[tokio::test]
async fn test_projects_lifecycle_and_rollups() {
    let pool = db::init_db("sqlite::memory:").await.expect("init db");
    let state = AppState::new(pool.clone());
    let app = create_app(state);

    // 1. Setup auth to get owner token
    let setup_req = Request::builder()
        .method("POST")
        .uri("/api/auth/setup")
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(
            serde_json::to_vec(&serde_json::json!({
                "password": "correct-horse-battery-staple"
            }))
            .unwrap(),
        ))
        .unwrap();

    let setup_res = app.clone().oneshot(setup_req).await.unwrap();
    let body_bytes = to_bytes(setup_res.into_body(), usize::MAX).await.unwrap();
    let setup_json: serde_json::Value = serde_json::from_slice(&body_bytes).unwrap();
    let token = setup_json["token"].as_str().unwrap().to_string();

    // 2. Create project
    let create_req = Request::builder()
        .method("POST")
        .uri("/api/v1/projects")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(
            serde_json::to_vec(&serde_json::json!({
                "name": "Rust Engine Rewrite",
                "description": "Port entire backend from old stack to Axum + SQLite",
                "color": "#6366f1",
                "status": "active"
            }))
            .unwrap(),
        ))
        .unwrap();

    let create_res = app.clone().oneshot(create_req).await.unwrap();
    assert_eq!(create_res.status(), StatusCode::OK);
    let bytes = to_bytes(create_res.into_body(), usize::MAX).await.unwrap();
    let created: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    let project_id = created["id"].as_str().unwrap().to_string();
    assert_eq!(created["name"], "Rust Engine Rewrite");
    assert_eq!(created["status"], "active");

    // 3. List projects
    let list_req = Request::builder()
        .method("GET")
        .uri("/api/v1/projects")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();

    let list_res = app.clone().oneshot(list_req).await.unwrap();
    assert_eq!(list_res.status(), StatusCode::OK);
    let bytes = to_bytes(list_res.into_body(), usize::MAX).await.unwrap();
    let projects: Vec<serde_json::Value> = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(projects.len(), 1);
    assert_eq!(projects[0]["id"], project_id);
    assert_eq!(projects[0]["task_count"], 0);
    assert_eq!(projects[0]["total_focus_seconds"], 0);

    // 4. Update project
    let update_req = Request::builder()
        .method("PATCH")
        .uri(format!("/api/v1/projects/{}", project_id))
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(
            serde_json::to_vec(&serde_json::json!({
                "description": "Updated description with new targets",
                "status": "active"
            }))
            .unwrap(),
        ))
        .unwrap();

    let update_res = app.clone().oneshot(update_req).await.unwrap();
    assert_eq!(update_res.status(), StatusCode::OK);
    let bytes = to_bytes(update_res.into_body(), usize::MAX).await.unwrap();
    let updated: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(updated["description"], "Updated description with new targets");

    // 5. Soft archive project
    let delete_req = Request::builder()
        .method("DELETE")
        .uri(format!("/api/v1/projects/{}", project_id))
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();

    let delete_res = app.clone().oneshot(delete_req).await.unwrap();
    assert_eq!(delete_res.status(), StatusCode::OK);

    // 6. Verify get project status is now archived
    let get_req = Request::builder()
        .method("GET")
        .uri(format!("/api/v1/projects/{}", project_id))
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();

    let get_res = app.clone().oneshot(get_req).await.unwrap();
    assert_eq!(get_res.status(), StatusCode::OK);
    let bytes = to_bytes(get_res.into_body(), usize::MAX).await.unwrap();
    let fetched: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(fetched["status"], "archived");

    // 7. Verify sync change exists
    let changes_req = Request::builder()
        .method("GET")
        .uri("/api/v1/sync/changes?cursor=0")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();

    let changes_res = app.clone().oneshot(changes_req).await.unwrap();
    assert_eq!(changes_res.status(), StatusCode::OK);
    let bytes = to_bytes(changes_res.into_body(), usize::MAX).await.unwrap();
    let changes_json: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    let changes = changes_json["changes"].as_array().unwrap();
    assert!(changes.iter().any(|c| c["entity_type"] == "project" && c["entity_id"] == project_id));
}
