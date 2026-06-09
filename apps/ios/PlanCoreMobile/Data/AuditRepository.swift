import Foundation
import Supabase

/// Read-only access to audit results (audit_runs / audit_findings).
struct AuditRepository {
    let client: SupabaseClient

    init(client: SupabaseClient = SupabaseClientProvider.shared) {
        self.client = client
    }

    /// Most recent audit run for a project, or nil if none.
    func latestRun(projectId: String) async throws -> AuditRun? {
        let rows: [AuditRun] = try await client
            .from("audit_runs")
            .select("id, severity, status, summary, created_at")
            .eq("project_id", value: projectId)
            .order("created_at", ascending: false)
            .limit(1)
            .execute()
            .value
        return rows.first
    }

    /// Findings for a given audit run, most severe context first.
    func findings(auditRunId: String) async throws -> [AuditFinding] {
        try await client
            .from("audit_findings")
            .select("id, rule_code, severity, summary, details, task_id")
            .eq("audit_run_id", value: auditRunId)
            .order("severity", ascending: true)
            .execute()
            .value
    }
}
