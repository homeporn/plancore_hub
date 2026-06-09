import Foundation

// One-to-one port of packages/core/src/graph/layout.ts.
// Longest-path layering (Kahn) → vertical stacking within each layer.

struct PositionedNode: Identifiable, Equatable {
    let node: GraphNode
    let layer: Int   // horizontal rank (0 = no predecessors)
    let order: Int   // vertical position within the layer
    let x: Double
    let y: Double
    let width: Double
    let height: Double

    var id: String { node.id }
}

struct GraphLayout {
    let nodes: [PositionedNode]
    let edges: [GraphEdge]
    let width: Double
    let height: Double
}

struct LayoutOptions {
    var nodeWidth: Double = 180
    var nodeHeight: Double = 64
    var hGap: Double = 90   // gap between layers (columns)
    var vGap: Double = 28   // gap between nodes within a layer
    var padding: Double = 40
}

enum GraphLayoutEngine {
    /// Assign each node a layer via longest-path layering, then stack nodes
    /// vertically within each layer. Nodes in cycles still get a layer (their
    /// back-edges are ignored for ranking) so the graph always renders.
    static func layout(_ model: GraphModel, options opts: LayoutOptions = LayoutOptions()) -> GraphLayout {
        let nodes = model.nodes
        let edges = model.edges

        if nodes.isEmpty {
            return GraphLayout(nodes: [], edges: edges, width: opts.padding * 2, height: opts.padding * 2)
        }

        // Adjacency for longest-path layering (predecessor → successors).
        var succ: [String: [String]] = [:]
        var indeg: [String: Int] = [:]
        let present = Set(nodes.map { $0.id })
        for n in nodes {
            succ[n.id] = []
            indeg[n.id] = 0
        }
        for e in edges {
            guard present.contains(e.source), present.contains(e.target) else { continue }
            succ[e.source, default: []].append(e.target)
            indeg[e.target, default: 0] += 1
        }

        // Kahn ordering; remaining (cyclic) nodes are appended afterwards.
        var layer: [String: Int] = [:]
        var queue: [String] = []
        var remainingDeg = indeg
        for n in nodes where (remainingDeg[n.id] ?? 0) == 0 {
            queue.append(n.id)
            layer[n.id] = 0
        }
        while !queue.isEmpty {
            let id = queue.removeFirst()
            let base = layer[id] ?? 0
            for s in succ[id] ?? [] {
                layer[s] = max(layer[s] ?? 0, base + 1)
                let d = (remainingDeg[s] ?? 1) - 1
                remainingDeg[s] = d
                if d == 0 { queue.append(s) }
            }
        }
        // Cyclic / unreached nodes: default to layer 0.
        for n in nodes where layer[n.id] == nil {
            layer[n.id] = 0
        }

        // Group nodes by layer, preserving input order for stability.
        var byLayer: [Int: [String]] = [:]
        var maxLayer = 0
        for n in nodes {
            let l = layer[n.id]!
            maxLayer = max(maxLayer, l)
            byLayer[l, default: []].append(n.id)
        }

        let nodeById = Dictionary(uniqueKeysWithValues: nodes.map { ($0.id, $0) })
        var positioned: [PositionedNode] = []
        var maxHeight: Double = 0

        for l in 0...maxLayer {
            let ids = byLayer[l] ?? []
            let colHeight = Double(ids.count) * opts.nodeHeight + Double(max(0, ids.count - 1)) * opts.vGap
            maxHeight = max(maxHeight, colHeight)
            let x = opts.padding + Double(l) * (opts.nodeWidth + opts.hGap)
            for (order, id) in ids.enumerated() {
                let n = nodeById[id]!
                positioned.append(
                    PositionedNode(
                        node: n,
                        layer: l,
                        order: order,
                        x: x,
                        y: opts.padding + Double(order) * (opts.nodeHeight + opts.vGap),
                        width: opts.nodeWidth,
                        height: opts.nodeHeight
                    )
                )
            }
        }

        let width = opts.padding * 2 + Double(maxLayer + 1) * opts.nodeWidth + Double(maxLayer) * opts.hGap
        let height = opts.padding * 2 + maxHeight

        return GraphLayout(nodes: positioned, edges: edges, width: width, height: height)
    }
}
