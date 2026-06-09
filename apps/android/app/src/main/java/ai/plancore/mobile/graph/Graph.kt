package ai.plancore.mobile.graph

import ai.plancore.mobile.data.LinkType
import ai.plancore.mobile.data.ScheduleRow

// Logic-network graph model + layout, ported from
// packages/core/src/graph/{types,build,layout}.ts.

data class GraphNode(
    val id: String,        // row_id
    val sdr: String,
    val name: String,
    val rowType: String,
    val isMilestone: Boolean,
)

data class GraphEdge(
    val id: String,        // "${source}->${target}:${type}"
    val source: String,    // predecessor row_id
    val target: String,    // successor row_id
    val type: LinkType,
    val lag: Int,
)

data class GraphModel(val nodes: List<GraphNode>, val edges: List<GraphEdge>)

data class PositionedNode(
    val node: GraphNode,
    val layer: Int,
    val order: Int,
    val x: Double,
    val y: Double,
    val width: Double,
    val height: Double,
)

data class GraphLayout(
    val nodes: List<PositionedNode>,
    val edges: List<GraphEdge>,
    val width: Double,
    val height: Double,
)

data class LayoutOptions(
    val nodeWidth: Double = 180.0,
    val nodeHeight: Double = 64.0,
    val hGap: Double = 90.0,
    val vGap: Double = 28.0,
    val padding: Double = 40.0,
)

object GraphBuilder {
    /** Mirrors buildGraph() in packages/core/src/graph/build.ts. Header rows
     *  are excluded; edges only between rows that both exist (dangling skipped). */
    fun build(rows: List<ScheduleRow>): GraphModel {
        val tasks = rows.filter { it.rowType != "заголовок" }
        val ids = tasks.map { it.rowId }.toSet()

        val nodes = tasks.map { r ->
            GraphNode(
                id = r.rowId,
                sdr = r.sdr,
                name = r.name,
                rowType = r.rowType,
                isMilestone = r.rowType == "веха",
            )
        }

        val edges = mutableListOf<GraphEdge>()
        for (r in tasks) {
            for (link in r.predecessors) {
                if (link.rowId !in ids) continue
                edges += GraphEdge(
                    id = "${link.rowId}->${r.rowId}:${link.type.value}",
                    source = link.rowId,
                    target = r.rowId,
                    type = link.type,
                    lag = link.lag,
                )
            }
        }
        return GraphModel(nodes, edges)
    }
}

object GraphLayoutEngine {
    /** One-to-one port of layoutGraph() in packages/core/src/graph/layout.ts. */
    fun layout(model: GraphModel, opts: LayoutOptions = LayoutOptions()): GraphLayout {
        val nodes = model.nodes
        val edges = model.edges

        if (nodes.isEmpty()) {
            return GraphLayout(emptyList(), edges, opts.padding * 2, opts.padding * 2)
        }

        val succ = HashMap<String, MutableList<String>>()
        val indeg = HashMap<String, Int>()
        val present = nodes.map { it.id }.toSet()
        for (n in nodes) {
            succ[n.id] = mutableListOf()
            indeg[n.id] = 0
        }
        for (e in edges) {
            if (e.source !in present || e.target !in present) continue
            succ.getValue(e.source).add(e.target)
            indeg[e.target] = (indeg[e.target] ?: 0) + 1
        }

        val layer = HashMap<String, Int>()
        val queue = ArrayDeque<String>()
        val remainingDeg = HashMap(indeg)
        for (n in nodes) {
            if ((remainingDeg[n.id] ?: 0) == 0) {
                queue.add(n.id)
                layer[n.id] = 0
            }
        }
        while (queue.isNotEmpty()) {
            val id = queue.removeFirst()
            val base = layer[id] ?: 0
            for (s in succ[id] ?: emptyList()) {
                layer[s] = maxOf(layer[s] ?: 0, base + 1)
                val d = (remainingDeg[s] ?: 1) - 1
                remainingDeg[s] = d
                if (d == 0) queue.add(s)
            }
        }
        for (n in nodes) if (n.id !in layer) layer[n.id] = 0

        val byLayer = HashMap<Int, MutableList<String>>()
        var maxLayer = 0
        for (n in nodes) {
            val l = layer.getValue(n.id)
            maxLayer = maxOf(maxLayer, l)
            byLayer.getOrPut(l) { mutableListOf() }.add(n.id)
        }

        val nodeById = nodes.associateBy { it.id }
        val positioned = mutableListOf<PositionedNode>()
        var maxHeight = 0.0

        for (l in 0..maxLayer) {
            val ids = byLayer[l] ?: emptyList()
            val colHeight = ids.size * opts.nodeHeight + maxOf(0, ids.size - 1) * opts.vGap
            maxHeight = maxOf(maxHeight, colHeight)
            val x = opts.padding + l * (opts.nodeWidth + opts.hGap)
            ids.forEachIndexed { order, id ->
                val n = nodeById.getValue(id)
                positioned += PositionedNode(
                    node = n,
                    layer = l,
                    order = order,
                    x = x,
                    y = opts.padding + order * (opts.nodeHeight + opts.vGap),
                    width = opts.nodeWidth,
                    height = opts.nodeHeight,
                )
            }
        }

        val width = opts.padding * 2 + (maxLayer + 1) * opts.nodeWidth + maxLayer * opts.hGap
        val height = opts.padding * 2 + maxHeight
        return GraphLayout(positioned, edges, width, height)
    }
}
