import Foundation

// Logic-network graph model, ported from packages/core/src/graph/types.ts and
// build.ts. Independent of any rendering layer.

enum LinkType: String, Codable {
    case fs = "FS"
    case ss = "SS"
    case ff = "FF"
    case sf = "SF"
}

struct GraphNode: Identifiable, Equatable {
    let id: String          // row_id
    let sdr: String
    let name: String
    let rowType: String
    let isMilestone: Bool
}

struct GraphEdge: Identifiable, Equatable {
    let id: String          // `${source}->${target}:${type}`
    let source: String      // predecessor row_id
    let target: String      // successor row_id
    let type: LinkType
    let lag: Int
}

struct GraphModel {
    var nodes: [GraphNode]
    var edges: [GraphEdge]
}

enum GraphBuilder {
    /// Build a logic-network graph model from schedule rows. Header rows are
    /// excluded — they are organisational, not logical. Edges are created only
    /// between rows that both exist in the graph. Mirrors buildGraph() in
    /// packages/core/src/graph/build.ts (read-only MVP omits CPM criticality).
    static func build(from rows: [ScheduleRow]) -> GraphModel {
        let tasks = rows.filter { $0.rowType != "заголовок" }
        let ids = Set(tasks.map { $0.rowId })

        let nodes = tasks.map { row in
            GraphNode(
                id: row.rowId,
                sdr: row.sdr,
                name: row.name,
                rowType: row.rowType,
                isMilestone: row.rowType == "веха"
            )
        }

        var edges: [GraphEdge] = []
        for row in tasks {
            for link in row.predecessors {
                guard ids.contains(link.rowId) else { continue } // skip dangling refs
                edges.append(
                    GraphEdge(
                        id: "\(link.rowId)->\(row.rowId):\(link.type.rawValue)",
                        source: link.rowId,
                        target: row.rowId,
                        type: link.type,
                        lag: link.lag
                    )
                )
            }
        }

        return GraphModel(nodes: nodes, edges: edges)
    }
}
