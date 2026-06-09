package ai.plancore.mobile.audit

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import ai.plancore.mobile.data.AuditFinding
import ai.plancore.mobile.data.AuditRepository
import ai.plancore.mobile.data.AuditRun

@Composable
fun AuditScreen(projectId: String) {
    val repo = remember { AuditRepository() }
    var run by remember { mutableStateOf<AuditRun?>(null) }
    var findings by remember { mutableStateOf<List<AuditFinding>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }

    LaunchedEffect(projectId) {
        loading = true
        runCatching {
            val r = repo.latestRun(projectId)
            run = r
            findings = r?.let { repo.findings(it.id) } ?: emptyList()
        }
        loading = false
    }

    when {
        loading -> Box(Modifier.fillMaxSize()) { CircularProgressIndicator(Modifier.align(Alignment.Center)) }
        run == null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("Аудит ещё не запускался", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        else -> LazyColumn(Modifier.fillMaxSize().padding(16.dp)) {
            item {
                Text("Последний аудит", style = MaterialTheme.typography.titleMedium)
                val r = run!!
                Text(r.summary.ifBlank { "Прогон от ${r.createdAt}" })
                Text(
                    "Статус: ${r.status} · Серьёзность: ${r.severity}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(12.dp))
                Text("Находки (${findings.size})", style = MaterialTheme.typography.titleMedium)
                HorizontalDivider()
            }
            items(findings) { f ->
                Column(Modifier.padding(vertical = 8.dp)) {
                    Text(f.summary, style = MaterialTheme.typography.bodyMedium)
                    Text(
                        "${f.ruleCode} · ${f.severity}",
                        style = MaterialTheme.typography.labelSmall,
                        color = severityColor(f.severity),
                    )
                    if (f.details.isNotBlank()) {
                        Text(f.details, style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                HorizontalDivider()
            }
        }
    }
}

private fun severityColor(severity: String): Color = when (severity.lowercase()) {
    "error", "critical", "high" -> Color(0xFFD32F2F)
    "warning", "medium" -> Color(0xFFF57C00)
    else -> Color.Gray
}
