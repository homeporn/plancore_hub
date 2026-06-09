package ai.plancore.mobile

import ai.plancore.mobile.data.PredecessorLink
import ai.plancore.mobile.data.LinkType
import ai.plancore.mobile.data.ScheduleRow
import ai.plancore.mobile.graph.GraphBuilder
import ai.plancore.mobile.graph.GraphLayoutEngine
import ai.plancore.mobile.graph.GraphModel
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/** Mirrors the reference behaviour of packages/core/src/graph/layout.ts. */
class GraphLayoutTest {

    private fun task(id: String, name: String, preds: List<String> = emptyList(), type: String = "задача/разработка") =
        ScheduleRow(
            rowId = id, sdr = id, name = name, rowType = type, stage = "", objectName = "",
            organization = "", department = "", responsible = "",
            predecessors = preds.map { PredecessorLink(it, LinkType.FS, 0) },
            plannedStart = null, plannedFinish = null, plannedDuration = null,
            percentComplete = null, taskStatus = "NOT_STARTED", sortOrder = 0,
        )

    @Test fun headersExcluded() {
        val model = GraphBuilder.build(listOf(
            task("h", "Header", type = "заголовок"),
            task("a", "A"),
            task("b", "B", preds = listOf("a")),
        ))
        assertEquals(2, model.nodes.size)
        assertEquals(1, model.edges.size)
    }

    @Test fun longestPathLayering() {
        // a → b → c and a → c: c must land in layer 2, not 1.
        val layout = GraphLayoutEngine.layout(GraphBuilder.build(listOf(
            task("a", "A"),
            task("b", "B", preds = listOf("a")),
            task("c", "C", preds = listOf("b", "a")),
        )))
        val layerById = layout.nodes.associate { it.node.id to it.layer }
        assertEquals(0, layerById["a"])
        assertEquals(1, layerById["b"])
        assertEquals(2, layerById["c"])
    }

    @Test fun cyclicGraphStillRenders() {
        val layout = GraphLayoutEngine.layout(GraphBuilder.build(listOf(
            task("a", "A", preds = listOf("b")),
            task("b", "B", preds = listOf("a")),
        )))
        assertEquals(2, layout.nodes.size)
        assertTrue(layout.nodes.all { it.layer >= 0 })
    }

    @Test fun emptyGraph() {
        val layout = GraphLayoutEngine.layout(GraphModel(emptyList(), emptyList()))
        assertTrue(layout.nodes.isEmpty())
        assertEquals(80.0, layout.width, 0.0)
        assertEquals(80.0, layout.height, 0.0)
    }

    @Test fun danglingRefSkipped() {
        val model = GraphBuilder.build(listOf(task("a", "A", preds = listOf("zzz"))))
        assertEquals(1, model.nodes.size)
        assertTrue(model.edges.isEmpty())
    }
}
