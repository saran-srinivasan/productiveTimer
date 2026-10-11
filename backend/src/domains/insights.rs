use axum::{extract::State, http::StatusCode, Json};
use chrono::Utc;
use serde_json::json;

use crate::auth::AuthenticatedOwner;
use crate::db::DbPool;
use crate::models::{InsightItem, InsightsResponse};

pub async fn get_deterministic_insights(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
) -> Result<Json<InsightsResponse>, (StatusCode, String)> {
    let now_str = Utc::now().to_rfc3339();

    // 1. Data sufficiency metrics
    let (days_logged, total_focus_seconds): (i64, i64) = sqlx::query_as(
        r#"
        SELECT 
            COUNT(DISTINCT work_date) as days_logged,
            COALESCE(SUM(seconds), 0) as total_seconds
        FROM focus_sessions
        "#,
    )
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to query session stats: {}", e)))?;

    let has_sufficient_data = days_logged >= 7;
    let mut insights: Vec<InsightItem> = Vec::new();

    // 2. Rule: Overdue High/Urgent Tasks
    let overdue_tasks: Vec<(String, String, String, Option<String>)> = sqlx::query_as(
        r#"
        SELECT id, title, priority, due_at
        FROM action_tasks
        WHERE status NOT IN ('completed', 'archived')
          AND priority IN ('high', 'urgent')
          AND due_at IS NOT NULL
          AND due_at < date('now')
        ORDER BY due_at ASC
        "#,
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    if !overdue_tasks.is_empty() {
        let count = overdue_tasks.len();
        let task_ids: Vec<String> = overdue_tasks.iter().map(|(id, _, _, _)| id.clone()).collect();
        let first_title = &overdue_tasks[0].1;

        insights.push(InsightItem {
            id: format!("overdue-tasks-{}", count),
            rule_id: "overdue_high_priority".to_string(),
            title: format!("{} High-Priority Task(s) Overdue", count),
            message: format!(
                "{} critical task(s) past deadline (e.g. '{}'). Immediate rescheduling or completion recommended.",
                count, first_title
            ),
            severity: "alert".to_string(),
            category: "tasks".to_string(),
            metric_name: "overdue_urgent_count".to_string(),
            formula: "COUNT(action_tasks WHERE status != 'completed' AND priority IN ('high', 'urgent') AND due_at < now)".to_string(),
            data_points: json!({
                "count": count,
                "task_titles": overdue_tasks.iter().map(|(_, t, _, _)| t.clone()).collect::<Vec<_>>()
            }),
            supporting_record_ids: task_ids,
            created_at: now_str.clone(),
        });
    }

    // 3. Rule: Slipping Goals (Target date approaching <= 7 days, progress < 70%)
    let slipping_goals: Vec<(String, String, f64, f64, String, String)> = sqlx::query_as(
        r#"
        SELECT id, title, target_value, current_value, unit, target_date
        FROM goals
        WHERE status = 'in_progress'
          AND target_date IS NOT NULL
          AND target_date >= date('now')
          AND target_date <= date('now', '+7 days')
          AND target_value > 0
          AND (current_value / target_value) < 0.70
        "#,
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    for (gid, gtitle, target_val, curr_val, gunit, target_dt) in slipping_goals {
        let completion_pct = (curr_val / target_val) * 100.0;
        insights.push(InsightItem {
            id: format!("goal-slipping-{}", gid),
            rule_id: "goal_slipping".to_string(),
            title: format!("Goal Pace Slipping: {}", gtitle),
            message: format!(
                "Goal is at {:.1}% ({}/{} {}) with target deadline {} approaching within 7 days.",
                completion_pct, curr_val, target_val, gunit, target_dt
            ),
            severity: "warning".to_string(),
            category: "goals".to_string(),
            metric_name: "goal_completion_pct".to_string(),
            formula: "(current_value / target_value) * 100".to_string(),
            data_points: json!({
                "current_value": curr_val,
                "target_value": target_val,
                "unit": gunit,
                "completion_pct": completion_pct,
                "target_date": target_dt
            }),
            supporting_record_ids: vec![gid],
            created_at: now_str.clone(),
        });
    }

    // 4. Rule: Project Focus Drop (>30% drop in past 7 days vs previous 7 days)
    let project_focus_drops: Vec<(String, String, i64, i64)> = sqlx::query_as(
        r#"
        WITH this_week AS (
            SELECT t.project_id, COALESCE(SUM(s.seconds), 0) as secs
            FROM focus_sessions s
            JOIN action_tasks t ON s.action_task_id = t.id
            WHERE s.work_date >= date('now', '-7 days')
              AND t.project_id IS NOT NULL
            GROUP BY t.project_id
        ),
        prev_week AS (
            SELECT t.project_id, COALESCE(SUM(s.seconds), 0) as secs
            FROM focus_sessions s
            JOIN action_tasks t ON s.action_task_id = t.id
            WHERE s.work_date >= date('now', '-14 days')
              AND s.work_date < date('now', '-7 days')
              AND t.project_id IS NOT NULL
            GROUP BY t.project_id
        )
        SELECT 
            p.id, 
            p.name, 
            COALESCE(tw.secs, 0) as curr_secs, 
            COALESCE(pw.secs, 0) as prev_secs
        FROM projects p
        JOIN prev_week pw ON p.id = pw.project_id
        LEFT JOIN this_week tw ON p.id = tw.project_id
        WHERE pw.secs >= 1800 
          AND COALESCE(tw.secs, 0) < pw.secs * 0.70
        "#,
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    for (pid, pname, curr_secs, prev_secs) in project_focus_drops {
        let drop_pct = ((prev_secs - curr_secs) as f64 / prev_secs as f64) * 100.0;
        insights.push(InsightItem {
            id: format!("project-focus-drop-{}", pid),
            rule_id: "project_focus_drop".to_string(),
            title: format!("Focus Velocity Drop: {}", pname),
            message: format!(
                "Focus time dropped {:.0}% this week ({:.1}h vs {:.1}h previous week). Check if project is blocked.",
                drop_pct,
                curr_secs as f64 / 3600.0,
                prev_secs as f64 / 3600.0
            ),
            severity: "warning".to_string(),
            category: "focus".to_string(),
            metric_name: "weekly_drop_pct".to_string(),
            formula: "((prev_week_seconds - this_week_seconds) / prev_week_seconds) * 100".to_string(),
            data_points: json!({
                "current_week_hours": curr_secs as f64 / 3600.0,
                "prev_week_hours": prev_secs as f64 / 3600.0,
                "drop_percentage": drop_pct
            }),
            supporting_record_ids: vec![pid],
            created_at: now_str.clone(),
        });
    }

    // 5. Rule: Estimation Bias (for completed tasks with estimate_minutes > 0)
    let estimation_rows: Vec<(String, i64, i64)> = sqlx::query_as(
        r#"
        SELECT 
            t.id,
            t.estimate_minutes,
            COALESCE(SUM(s.seconds), 0) / 60 as actual_minutes
        FROM action_tasks t
        JOIN focus_sessions s ON s.action_task_id = t.id
        WHERE t.status = 'completed'
          AND t.estimate_minutes IS NOT NULL
          AND t.estimate_minutes > 0
        GROUP BY t.id
        "#,
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    if estimation_rows.len() >= 2 {
        let total_est: i64 = estimation_rows.iter().map(|(_, est, _)| est).sum();
        let total_act: i64 = estimation_rows.iter().map(|(_, _, act)| act).sum();
        let supporting_ids: Vec<String> = estimation_rows.iter().map(|(id, _, _)| id.clone()).collect();

        if total_est > 0 {
            let bias_factor = total_act as f64 / total_est as f64;
            if bias_factor >= 1.25 {
                insights.push(InsightItem {
                    id: "estimation-bias-under".to_string(),
                    rule_id: "estimation_bias_under".to_string(),
                    title: "Underestimation Bias Pattern".to_string(),
                    message: format!(
                        "Completed tasks required {:.0}% more time than planned across {} calibrated tasks (Bias factor: {:.2}x). Consider applying a 1.{:.0}x multiplier to estimates.",
                        (bias_factor - 1.0) * 100.0,
                        estimation_rows.len(),
                        bias_factor,
                        (bias_factor - 1.0) * 10.0
                    ),
                    severity: "info".to_string(),
                    category: "estimation".to_string(),
                    metric_name: "planning_bias_factor".to_string(),
                    formula: "total_actual_minutes / total_estimated_minutes".to_string(),
                    data_points: json!({
                        "total_estimated_minutes": total_est,
                        "total_actual_minutes": total_act,
                        "bias_factor": bias_factor,
                        "calibrated_tasks_count": estimation_rows.len()
                    }),
                    supporting_record_ids: supporting_ids,
                    created_at: now_str.clone(),
                });
            } else if bias_factor <= 0.80 {
                insights.push(InsightItem {
                    id: "estimation-bias-over".to_string(),
                    rule_id: "estimation_bias_over".to_string(),
                    title: "Buffer Overhead in Estimates".to_string(),
                    message: format!(
                        "Completed tasks finished faster than estimated ({:.0}% of planned duration, Bias factor: {:.2}x). Estimates can be tightened.",
                        bias_factor * 100.0,
                        bias_factor
                    ),
                    severity: "info".to_string(),
                    category: "estimation".to_string(),
                    metric_name: "planning_bias_factor".to_string(),
                    formula: "total_actual_minutes / total_estimated_minutes".to_string(),
                    data_points: json!({
                        "total_estimated_minutes": total_est,
                        "total_actual_minutes": total_act,
                        "bias_factor": bias_factor,
                        "calibrated_tasks_count": estimation_rows.len()
                    }),
                    supporting_record_ids: supporting_ids,
                    created_at: now_str.clone(),
                });
            }
        }
    }

    // 6. Rule: Habit Consistency Momentum
    let habit_momentum: Option<(i64, i64)> = sqlx::query_as(
        r#"
        SELECT 
            COUNT(DISTINCT e.habit_id) as active_habits_completed,
            (SELECT COUNT(*) FROM habit_definitions WHERE active = 1) as total_habits
        FROM habit_entries e
        WHERE e.completion_date >= date('now', '-7 days')
        "#,
    )
    .fetch_optional(&pool)
    .await
    .unwrap_or(None);

    if let Some((completed_habits, total_habits)) = habit_momentum {
        if total_habits > 0 && completed_habits >= total_habits {
            insights.push(InsightItem {
                id: "habit-momentum-high".to_string(),
                rule_id: "habit_momentum".to_string(),
                title: "All Target Habits Active".to_string(),
                message: format!(
                    "Every one of your {} defined habits recorded completions in the past 7 days.",
                    total_habits
                ),
                severity: "success".to_string(),
                category: "habits".to_string(),
                metric_name: "active_habit_adherence".to_string(),
                formula: "completed_active_habits / total_active_habits".to_string(),
                data_points: json!({
                    "completed_habits": completed_habits,
                    "total_habits": total_habits
                }),
                supporting_record_ids: vec![],
                created_at: now_str.clone(),
            });
        }
    }

    Ok(Json(InsightsResponse {
        insights,
        days_logged,
        total_focus_seconds,
        has_sufficient_data,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{
        body::{to_bytes, Body},
        http::{header, Request, StatusCode},
    };
    use crate::{create_app, db, AppState};
    use tower::ServiceExt;

    #[tokio::test]
    async fn test_rule_based_deterministic_insights_engine() {
        let pool = db::init_db("sqlite::memory:").await.expect("init db");
        let state = AppState::new(pool.clone());
        let app = create_app(state);

        // 1. Setup auth
        let setup_req = Request::builder()
            .method("POST")
            .uri("/api/auth/setup")
            .header(header::CONTENT_TYPE, "application/json")
            .body(Body::from(
                serde_json::to_vec(&serde_json::json!({
                    "password": "master-secure-password-1234"
                }))
                .unwrap(),
            ))
            .unwrap();

        let setup_res = app.clone().oneshot(setup_req).await.unwrap();
        let body_bytes = to_bytes(setup_res.into_body(), usize::MAX).await.unwrap();
        let setup_json: serde_json::Value = serde_json::from_slice(&body_bytes).unwrap();
        let token = setup_json["token"].as_str().unwrap().to_string();

        // 2. Fresh state -> insufficient data
        let insights_req = Request::builder()
            .method("GET")
            .uri("/api/v1/insights")
            .header(header::AUTHORIZATION, format!("Bearer {}", token))
            .body(Body::empty())
            .unwrap();

        let insights_res = app.clone().oneshot(insights_req).await.unwrap();
        assert_eq!(insights_res.status(), StatusCode::OK);
        let bytes = to_bytes(insights_res.into_body(), usize::MAX).await.unwrap();
        let resp: InsightsResponse = serde_json::from_slice(&bytes).unwrap();
        assert_eq!(resp.days_logged, 0);
        assert!(!resp.has_sufficient_data);
        assert!(resp.insights.is_empty());

        // 3. Insert Overdue Urgent Task
        sqlx::query(
            r#"
            INSERT INTO action_tasks (id, title, status, priority, due_at, created_at, updated_at)
            VALUES ('task-overdue-1', 'Critical Production Fix', 'ready', 'urgent', date('now', '-2 days'), datetime('now'), datetime('now'))
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        // 4. Insert Slipping Goal
        sqlx::query(
            r#"
            INSERT INTO goals (id, title, goal_type, target_value, current_value, unit, start_date, target_date, status, created_at)
            VALUES ('goal-slip-1', 'Launch Beta', 'outcome', 100.0, 30.0, '%', date('now', '-20 days'), date('now', '+3 days'), 'in_progress', datetime('now'))
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        // 5. Insert Completed Tasks with Estimates and Sessions showing Underestimation Bias
        sqlx::query(
            r#"
            INSERT INTO focus_tasks (id, name, target_minutes, color)
            VALUES ('lane-eng', 'Engineering', 45, '#3b82f6')
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query(
            r#"
            INSERT INTO action_tasks (id, title, status, priority, estimate_minutes, created_at, updated_at)
            VALUES ('task-cal-1', 'Build Auth', 'completed', 'high', 30, datetime('now'), datetime('now')),
                   ('task-cal-2', 'Build DB', 'completed', 'medium', 20, datetime('now'), datetime('now'))
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query(
            r#"
            INSERT INTO focus_sessions (id, task_id, action_task_id, seconds, note, work_date, ended_at, created_at)
            VALUES ('sess-1', 'lane-eng', 'task-cal-1', 3600, 'Done auth', date('now'), datetime('now'), datetime('now')),
                   ('sess-2', 'lane-eng', 'task-cal-2', 2400, 'Done db', date('now'), datetime('now'), datetime('now'))
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        // 6. Query insights again and verify deterministic rules
        let insights_req2 = Request::builder()
            .method("GET")
            .uri("/api/v1/insights")
            .header(header::AUTHORIZATION, format!("Bearer {}", token))
            .body(Body::empty())
            .unwrap();

        let insights_res2 = app.clone().oneshot(insights_req2).await.unwrap();
        assert_eq!(insights_res2.status(), StatusCode::OK);
        let bytes2 = to_bytes(insights_res2.into_body(), usize::MAX).await.unwrap();
        let resp2: InsightsResponse = serde_json::from_slice(&bytes2).unwrap();

        // Verify overdue task insight triggered
        let overdue_insight = resp2.insights.iter().find(|i| i.rule_id == "overdue_high_priority");
        assert!(overdue_insight.is_some(), "Overdue task rule should fire");
        let oi = overdue_insight.unwrap();
        assert_eq!(oi.severity, "alert");
        assert!(oi.supporting_record_ids.contains(&"task-overdue-1".to_string()));

        // Verify slipping goal insight triggered
        let goal_insight = resp2.insights.iter().find(|i| i.rule_id == "goal_slipping");
        assert!(goal_insight.is_some(), "Slipping goal rule should fire");
        let gi = goal_insight.unwrap();
        assert_eq!(gi.severity, "warning");
        assert!(gi.supporting_record_ids.contains(&"goal-slip-1".to_string()));

        // Verify estimation bias insight triggered
        let bias_insight = resp2.insights.iter().find(|i| i.rule_id == "estimation_bias_under");
        assert!(bias_insight.is_some(), "Estimation bias underestimation should fire");
        let bi = bias_insight.unwrap();
        assert_eq!(bi.category, "estimation");
        assert!(bi.message.contains("2.00x"));
        assert!(bi.supporting_record_ids.contains(&"task-cal-1".to_string()));
        assert!(bi.supporting_record_ids.contains(&"task-cal-2".to_string()));
    }
}

