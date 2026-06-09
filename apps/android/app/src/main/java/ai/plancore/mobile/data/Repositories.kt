package ai.plancore.mobile.data

import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.serialization.Serializable
import kotlinx.serialization.SerialName

/**
 * Read-only repository over Supabase PostgREST. Mirrors the queries in
 * packages/data/src/repositories/projects.ts. RLS scopes every result to the
 * signed-in user's project memberships.
 */
class ProjectsRepository(private val client: SupabaseClient = Supabase.client) {

    @Serializable
    private data class MembershipRow(val projects: ProjectDto)

    @Serializable
    private data class VersionRow(val id: String)

    @Serializable
    private data class BoundRow(
        @SerialName("planned_start") val plannedStart: String? = null,
        @SerialName("planned_finish") val plannedFinish: String? = null,
    )

    suspend fun listProjectsWithMeta(userId: String): List<ProjectMeta> {
        val memberships = client.postgrest["project_members"].select(
            columns = io.github.jan.supabase.postgrest.query.Columns.raw(
                "project_id, projects!inner(id, name, description, status, stage, object_type, project_status_date)"
            )
        ) {
            filter { eq("user_id", userId) }
        }.decodeList<MembershipRow>()

        return memberships.map { m ->
            val p = m.projects
            val meta = ProjectMeta(
                id = p.id, name = p.name, status = p.status, stage = p.stage,
                statusDate = p.projectStatusDate,
            )
            currentVersionId(p.id)?.let { versionId ->
                val (start, finish, count) = versionBounds(versionId)
                meta.startDate = start
                meta.finishDate = finish
                meta.taskCount = count
            }
            meta
        }
    }

    suspend fun currentVersionId(projectId: String): String? =
        client.postgrest["project_schedule_versions"].select(
            columns = io.github.jan.supabase.postgrest.query.Columns.raw("id")
        ) {
            filter {
                eq("project_id", projectId)
                eq("is_current", true)
            }
            limit(1)
        }.decodeList<VersionRow>().firstOrNull()?.id

    suspend fun loadCurrentScheduleRows(projectId: String): List<ScheduleRow> {
        val versionId = currentVersionId(projectId) ?: return emptyList()
        return client.postgrest["project_schedule_version_tasks"].select {
            filter { eq("schedule_version_id", versionId) }
            order("sort_order", Order.ASCENDING)
        }.decodeList<VersionTaskDto>().map { it.toScheduleRow() }
    }

    private suspend fun versionBounds(versionId: String): Triple<String?, String?, Int> {
        val rows = client.postgrest["project_schedule_version_tasks"].select(
            columns = io.github.jan.supabase.postgrest.query.Columns.raw("planned_start, planned_finish")
        ) {
            filter { eq("schedule_version_id", versionId) }
        }.decodeList<BoundRow>()

        var start: String? = null
        var finish: String? = null
        for (r in rows) {
            r.plannedStart?.let { if (start == null || it < start!!) start = it }
            r.plannedFinish?.let { if (finish == null || it > finish!!) finish = it }
        }
        return Triple(start, finish, rows.size)
    }
}

/** Read-only access to audit results (audit_runs / audit_findings). */
class AuditRepository(private val client: SupabaseClient = Supabase.client) {

    suspend fun latestRun(projectId: String): AuditRun? =
        client.postgrest["audit_runs"].select {
            filter { eq("project_id", projectId) }
            order("created_at", Order.DESCENDING)
            limit(1)
        }.decodeList<AuditRun>().firstOrNull()

    suspend fun findings(auditRunId: String): List<AuditFinding> =
        client.postgrest["audit_findings"].select {
            filter { eq("audit_run_id", auditRunId) }
            order("severity", Order.ASCENDING)
        }.decodeList<AuditFinding>()
}
