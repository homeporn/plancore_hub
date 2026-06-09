import Foundation

// Domain models for the read-only mobile client. Ported from
// packages/core/src/schedule/types.ts and the DB columns in
// packages/data/src/supabase/database.types.ts. Decoding mirrors
// packages/data/src/mappers/scheduleVersionTask.ts.

struct PredecessorLink: Equatable {
    let rowId: String
    let type: LinkType
    let lag: Int     // days; positive = delay, negative = overlap
}

/// A schedule row (task or header) as stored in project_schedule_version_tasks.
struct ScheduleRow: Identifiable, Equatable {
    let rowId: String        // task_row_id ?? id
    let sdr: String          // wbs_code
    let name: String
    let rowType: String      // row_type
    let stage: String
    let object: String       // object_name
    let organization: String
    let department: String
    let responsible: String
    let predecessors: [PredecessorLink]
    let plannedStart: String?    // ISO date (YYYY-MM-DD)
    let plannedFinish: String?
    let plannedDuration: Int?
    let percentComplete: Double?
    let taskStatus: String       // NOT_STARTED | IN_PROGRESS | COMPLETED
    let sortOrder: Int

    var id: String { rowId }
}

/// Raw decodable matching the PostgREST row shape, then mapped to ScheduleRow.
struct VersionTaskDTO: Decodable {
    let id: String
    let task_row_id: String?
    let wbs_code: String
    let name: String
    let row_type: String
    let stage: String
    let object_name: String
    let organization: String
    let department: String
    let responsible: String
    let predecessors_json: [PredecessorJSON]?
    let planned_start: String?
    let planned_finish: String?
    let planned_duration: Int?
    let percent_complete: Double?
    let task_status: String?
    let sort_order: Int

    struct PredecessorJSON: Decodable {
        let rowId: String?
        let type: String?
        let lag: Double?
    }

    func toScheduleRow() -> ScheduleRow {
        let preds: [PredecessorLink] = (predecessors_json ?? []).compactMap { raw in
            guard let rowId = raw.rowId else { return nil }
            let type = LinkType(rawValue: raw.type ?? "FS") ?? .fs
            return PredecessorLink(rowId: rowId, type: type, lag: Int(raw.lag ?? 0))
        }
        return ScheduleRow(
            rowId: task_row_id ?? id,
            sdr: wbs_code,
            name: name,
            rowType: row_type,
            stage: stage,
            object: object_name,
            organization: organization,
            department: department,
            responsible: responsible,
            predecessors: preds,
            plannedStart: planned_start,
            plannedFinish: planned_finish,
            plannedDuration: planned_duration,
            percentComplete: percent_complete,
            taskStatus: task_status ?? "NOT_STARTED",
            sortOrder: sort_order
        )
    }
}

/// Project list item with computed schedule bounds (Hub-style metadata).
struct ProjectMeta: Identifiable, Equatable, Hashable {
    let id: String
    let name: String
    let description: String
    let status: String
    let stage: String
    let objectType: String
    let statusDate: String?
    var startDate: String?
    var finishDate: String?
    var taskCount: Int
}

struct ProjectDTO: Decodable {
    let id: String
    let name: String
    let description: String
    let status: String
    let stage: String
    let object_type: String
    let project_status_date: String?
}

struct AuditFinding: Identifiable, Decodable, Equatable {
    let id: String
    let rule_code: String
    let severity: String
    let summary: String
    let details: String
    let task_id: String?
}

struct AuditRun: Identifiable, Decodable, Equatable {
    let id: String
    let severity: String
    let status: String
    let summary: String
    let created_at: String
}
