package ai.plancore.mobile.graph

import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.*
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.Canvas
import ai.plancore.mobile.data.ScheduleRow

/**
 * Read-only canvas view of the logic network. Builds the graph from schedule
 * rows, lays it out with the ported GraphLayoutEngine, and draws nodes + edges
 * with pinch-to-zoom and pan.
 */
@Composable
fun GraphScreen(rows: List<ScheduleRow>) {
    val layout = remember(rows) { GraphLayoutEngine.layout(GraphBuilder.build(rows)) }
    val nodeById = remember(layout) { layout.nodes.associateBy { it.node.id } }

    var scale by remember { mutableStateOf(1f) }
    var offset by remember { mutableStateOf(Offset.Zero) }
    val density = LocalDensity.current

    if (rows.isEmpty()) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("Нет данных графика", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        return
    }

    Canvas(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.surface)
            .pointerInput(Unit) {
                detectTransformGestures { _, pan, zoom, _ ->
                    scale = (scale * zoom).coerceIn(0.2f, 4f)
                    offset += pan
                }
            }
    ) {
        val edgeColor = Color.Gray
        val nodeFill = Color(0x1A2196F3)
        val milestoneFill = Color(0x33FF9800)
        val textPaint = android.graphics.Paint().apply {
            color = android.graphics.Color.DKGRAY
            textSize = with(density) { 11.sp.toPx() }
            isAntiAlias = true
        }

        withTransform({
            translate(offset.x, offset.y)
            scale(scale, scale, pivot = Offset.Zero)
        }) {
            // Edges first (under nodes).
            for (e in layout.edges) {
                val s = nodeById[e.source] ?: continue
                val t = nodeById[e.target] ?: continue
                drawLine(
                    color = edgeColor,
                    start = Offset((s.x + s.width).toFloat(), (s.y + s.height / 2).toFloat()),
                    end = Offset(t.x.toFloat(), (t.y + t.height / 2).toFloat()),
                    strokeWidth = 1f,
                )
            }
            // Nodes.
            for (n in layout.nodes) {
                drawRoundRect(
                    color = if (n.node.isMilestone) milestoneFill else nodeFill,
                    topLeft = Offset(n.x.toFloat(), n.y.toFloat()),
                    size = androidx.compose.ui.geometry.Size(n.width.toFloat(), n.height.toFloat()),
                    cornerRadius = androidx.compose.ui.geometry.CornerRadius(8f, 8f),
                    style = Stroke(width = 1f),
                )
                drawContext.canvas.nativeCanvas.apply {
                    drawText(n.node.sdr, (n.x + 6).toFloat(), (n.y + 18).toFloat(), textPaint)
                    val label = n.node.name.take(22)
                    drawText(label, (n.x + 6).toFloat(), (n.y + 36).toFloat(), textPaint)
                }
            }
        }
    }
}
