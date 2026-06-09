import XCTest
@testable import PlanCoreMobile

/// Mirrors the reference behaviour of packages/core/src/graph/layout.ts.
final class GraphLayoutTests: XCTestCase {

    private func task(_ id: String, _ name: String, preds: [String] = [], type: String = "задача/разработка") -> ScheduleRow {
        ScheduleRow(
            rowId: id, sdr: id, name: name, rowType: type, stage: "", object: "",
            organization: "", department: "", responsible: "",
            predecessors: preds.map { PredecessorLink(rowId: $0, type: .fs, lag: 0) },
            plannedStart: nil, plannedFinish: nil, plannedDuration: nil,
            percentComplete: nil, taskStatus: "NOT_STARTED", sortOrder: 0
        )
    }

    func testHeadersExcludedFromGraph() {
        let rows = [
            task("h", "Header", type: "заголовок"),
            task("a", "A"),
            task("b", "B", preds: ["a"]),
        ]
        let model = GraphBuilder.build(from: rows)
        XCTAssertEqual(model.nodes.count, 2)
        XCTAssertEqual(model.edges.count, 1)
    }

    func testLongestPathLayering() {
        // a → b → c, and a → c. c must land in layer 2 (longest path), not 1.
        let rows = [
            task("a", "A"),
            task("b", "B", preds: ["a"]),
            task("c", "C", preds: ["b", "a"]),
        ]
        let layout = GraphLayoutEngine.layout(GraphBuilder.build(from: rows))
        let layerById = Dictionary(uniqueKeysWithValues: layout.nodes.map { ($0.id, $0.layer) })
        XCTAssertEqual(layerById["a"], 0)
        XCTAssertEqual(layerById["b"], 1)
        XCTAssertEqual(layerById["c"], 2)
    }

    func testCyclicGraphStillRenders() {
        // a → b → a forms a cycle; every node must still receive a layer.
        let rows = [
            task("a", "A", preds: ["b"]),
            task("b", "B", preds: ["a"]),
        ]
        let layout = GraphLayoutEngine.layout(GraphBuilder.build(from: rows))
        XCTAssertEqual(layout.nodes.count, 2)
        for node in layout.nodes {
            XCTAssertGreaterThanOrEqual(node.layer, 0)
        }
    }

    func testEmptyGraph() {
        let layout = GraphLayoutEngine.layout(GraphModel(nodes: [], edges: []))
        XCTAssertTrue(layout.nodes.isEmpty)
        XCTAssertEqual(layout.width, 80)  // padding * 2
        XCTAssertEqual(layout.height, 80)
    }

    func testDanglingRefSkipped() {
        // Predecessor "zzz" does not exist → edge skipped, node still present.
        let rows = [task("a", "A", preds: ["zzz"])]
        let model = GraphBuilder.build(from: rows)
        XCTAssertEqual(model.nodes.count, 1)
        XCTAssertTrue(model.edges.isEmpty)
    }
}
