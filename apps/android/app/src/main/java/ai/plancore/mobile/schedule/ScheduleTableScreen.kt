package ai.plancore.mobile.schedule

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import ai.plancore.mobile.data.ScheduleRow

/** Read-only, horizontally scrollable table of schedule rows. */
@Composable
fun ScheduleTableScreen(rows: List<ScheduleRow>) {
    val scroll = rememberScrollState()
    Column(Modifier.fillMaxSize().horizontalScroll(scroll)) {
        HeaderRow()
        HorizontalDivider()
        LazyColumn {
            items(rows) { row ->
                DataRow(row)
                HorizontalDivider()
            }
        }
    }
}

@Composable
private fun HeaderRow() {
    Row(Modifier.padding(horizontal = 8.dp)) {
        Cell("СДР", 90, bold = true)
        Cell("Наименование", 220, bold = true)
        Cell("Тип", 130, bold = true)
        Cell("Начало", 100, bold = true)
        Cell("Окончание", 100, bold = true)
        Cell("Дл.", 50, bold = true)
        Cell("%", 50, bold = true)
        Cell("Ответственный", 160, bold = true)
    }
}

@Composable
private fun DataRow(row: ScheduleRow) {
    Row(Modifier.padding(horizontal = 8.dp)) {
        Cell(row.sdr, 90)
        Cell(row.name, 220, bold = row.rowType == "заголовок")
        Cell(row.rowType, 130)
        Cell(row.plannedStart ?: "—", 100)
        Cell(row.plannedFinish ?: "—", 100)
        Cell(row.plannedDuration?.toString() ?: "—", 50)
        Cell(row.percentComplete?.toInt()?.toString() ?: "—", 50)
        Cell(row.responsible, 160)
    }
}

@Composable
private fun Cell(text: String, width: Int, bold: Boolean = false) {
    Text(
        text = text,
        maxLines = 1,
        overflow = TextOverflow.Ellipsis,
        fontWeight = if (bold) FontWeight.SemiBold else FontWeight.Normal,
        style = MaterialTheme.typography.bodySmall,
        modifier = Modifier.width(width.dp).padding(vertical = 6.dp, horizontal = 4.dp),
    )
}
