import Foundation
import Supabase

/// Read-only repository over Supabase PostgREST. Mirrors the queries in
/// packages/data/src/repositories/projects.ts. RLS on the backend scopes every
/// result to the signed-in user's project memberships.
struct ProjectsRepository {
    let client: SupabaseClient

    init(client: SupabaseClient = SupabaseClientProvider.shared) {
        self.client = client
    }

    /// Projects the current user is a member of, with display metadata and
    /// computed schedule bounds (min planned_start / max planned_finish / count).
    func listProjectsWithMeta(userId: String) async throws -> [ProjectMeta] {
        struct MembershipRow: Decodable { let projects: ProjectDTO }

        let memberships: [MembershipRow] = try await client
            .from("project_members")
            .select("project_id, projects!inner(id, name, description, status, stage, object_type, project_status_date)")
            .eq("user_id", value: userId)
            .execute()
            .value

        var result: [ProjectMeta] = []
        for m in memberships {
            let p = m.projects
            var meta = ProjectMeta(
                id: p.id, name: p.name, description: p.description, status: p.status,
                stage: p.stage, objectType: p.object_type, statusDate: p.project_status_date,
                startDate: nil, finishDate: nil, taskCount: 0
            )
            if let versionId = try await currentVersionId(projectId: p.id) {
                let bounds = try await versionBounds(scheduleVersionId: versionId)
                meta.startDate = bounds.start
                meta.finishDate = bounds.finish
                meta.taskCount = bounds.count
            }
            result.append(meta)
        }
        return result
    }

    /// Id of the project's current schedule version, or nil if none.
    func currentVersionId(projectId: String) async throws -> String? {
        struct VersionRow: Decodable { let id: String }
        let rows: [VersionRow] = try await client
            .from("project_schedule_versions")
            .select("id")
            .eq("project_id", value: projectId)
            .eq("is_current", value: true)
            .limit(1)
            .execute()
            .value
        return rows.first?.id
    }

    /// Rows of the project's current schedule version, ordered by sort_order.
    func loadCurrentScheduleRows(projectId: String) async throws -> [ScheduleRow] {
        guard let versionId = try await currentVersionId(projectId: projectId) else { return [] }
        let tasks: [VersionTaskDTO] = try await client
            .from("project_schedule_version_tasks")
            .select("*")
            .eq("schedule_version_id", value: versionId)
            .order("sort_order", ascending: true)
            .execute()
            .value
        return tasks.map { $0.toScheduleRow() }
    }

    private func versionBounds(scheduleVersionId: String) async throws -> (start: String?, finish: String?, count: Int) {
        struct BoundRow: Decodable { let planned_start: String?; let planned_finish: String? }
        let rows: [BoundRow] = try await client
            .from("project_schedule_version_tasks")
            .select("planned_start, planned_finish")
            .eq("schedule_version_id", value: scheduleVersionId)
            .execute()
            .value
        var start: String?; var finish: String?
        for r in rows {
            if let s = r.planned_start, start == nil || s < start! { start = s }
            if let f = r.planned_finish, finish == nil || f > finish! { finish = f }
        }
        return (start, finish, rows.count)
    }
}
