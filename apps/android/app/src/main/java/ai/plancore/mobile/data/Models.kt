package ai.plancore.mobile.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.contentOrNull

// Domain + DTO models, ported from packages/core/src/schedule/types.ts and the
// DB columns in packages/data/src/supabase/database.types.ts. Mapping mirrors
// packages/data/src/mappers/scheduleVersionTask.ts.

enum class LinkType(val value: String) {
    FS("FS"), SS("SS"), FF("FF"), SF("SF");
    companion object {
        fun from(raw: String?): LinkType = entries.firstOrNull { it.value == raw } ?: FS
    }
}

data class PredecessorLink(val rowId: String, val type: LinkType, val lag: Int)

data class ScheduleRow(
    val rowId: String,
    val sdr: String,
    val name: String,
    val rowType: String,
    val stage: String,
    val objectName: String,
    val organization: String,
    val department: String,
    val responsible: String,
    val predecessors: List<PredecessorLink>,
    val plannedStart: String?,
    val plannedFinish: String?,
    val plannedDuration: Int?,
    val percentComplete: Double?,
    val taskStatus: String,
    val sortOrder: Int,
)

@Serializable
data class VersionTaskDto(
    val id: String,
    @SerialName("task_row_id") val taskRowId: String? = null,
    @SerialName("wbs_code") val wbsCode: String = "",
    val name: String = "",
    @SerialName("row_type") val rowType: String = "",
    val stage: String = "",
    @SerialName("object_name") val objectName: String = "",
    val organization: String = "",
    val department: String = "",
    val responsible: String = "",
    @SerialName("predecessors_json") val predecessorsJson: JsonElement? = null,
    @SerialName("planned_start") val plannedStart: String? = null,
    @SerialName("planned_finish") val plannedFinish: String? = null,
    @SerialName("planned_duration") val plannedDuration: Int? = null,
    @SerialName("percent_complete") val percentComplete: Double? = null,
    @SerialName("task_status") val taskStatus: String? = null,
    @SerialName("sort_order") val sortOrder: Int = 0,
) {
    fun toScheduleRow(): ScheduleRow = ScheduleRow(
        rowId = taskRowId ?: id,
        sdr = wbsCode,
        name = name,
        rowType = rowType,
        stage = stage,
        objectName = objectName,
        organization = organization,
        department = department,
        responsible = responsible,
        predecessors = parsePredecessors(predecessorsJson),
        plannedStart = plannedStart,
        plannedFinish = plannedFinish,
        plannedDuration = plannedDuration,
        percentComplete = percentComplete,
        taskStatus = taskStatus ?: "NOT_STARTED",
        sortOrder = sortOrder,
    )

    private fun parsePredecessors(json: JsonElement?): List<PredecessorLink> {
        val arr = json as? JsonArray ?: return emptyList()
        return arr.mapNotNull { el ->
            val obj = el as? JsonObject ?: return@mapNotNull null
            val rowId = obj["rowId"]?.jsonPrimitive?.contentOrNull ?: return@mapNotNull null
            val type = LinkType.from(obj["type"]?.jsonPrimitive?.contentOrNull)
            val lag = obj["lag"]?.jsonPrimitive?.intOrNull ?: 0
            PredecessorLink(rowId, type, lag)
        }
    }
}

@Serializable
data class ProjectDto(
    val id: String,
    val name: String = "",
    val description: String = "",
    val status: String = "",
    val stage: String = "",
    @SerialName("object_type") val objectType: String = "",
    @SerialName("project_status_date") val projectStatusDate: String? = null,
)

data class ProjectMeta(
    val id: String,
    val name: String,
    val status: String,
    val stage: String,
    val statusDate: String?,
    var startDate: String? = null,
    var finishDate: String? = null,
    var taskCount: Int = 0,
)

@Serializable
data class AuditRun(
    val id: String,
    val severity: String = "",
    val status: String = "",
    val summary: String = "",
    @SerialName("created_at") val createdAt: String = "",
)

@Serializable
data class AuditFinding(
    val id: String,
    @SerialName("rule_code") val ruleCode: String = "",
    val severity: String = "",
    val summary: String = "",
    val details: String = "",
    @SerialName("task_id") val taskId: String? = null,
)
