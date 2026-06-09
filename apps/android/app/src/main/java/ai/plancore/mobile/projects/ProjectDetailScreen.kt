package ai.plancore.mobile.projects

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import ai.plancore.mobile.audit.AuditScreen
import ai.plancore.mobile.data.ProjectsRepository
import ai.plancore.mobile.data.ScheduleRow
import ai.plancore.mobile.graph.GraphScreen
import ai.plancore.mobile.schedule.ScheduleTableScreen

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProjectDetailScreen(
    projectId: String,
    projectName: String,
    onBack: () -> Unit,
) {
    val repo = remember { ProjectsRepository() }
    var rows by remember { mutableStateOf<List<ScheduleRow>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var tab by remember { mutableStateOf(0) }

    LaunchedEffect(projectId) {
        loading = true
        runCatching { repo.loadCurrentScheduleRows(projectId) }.onSuccess { rows = it }
        loading = false
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(projectName) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Назад")
                    }
                },
            )
        }
    ) { padding ->
        Column(Modifier.padding(padding).fillMaxSize()) {
            TabRow(selectedTabIndex = tab) {
                listOf("Таблица", "Граф", "Аудит").forEachIndexed { i, title ->
                    Tab(selected = tab == i, onClick = { tab = i }, text = { Text(title) })
                }
            }
            if (loading && tab != 2) {
                Box(Modifier.fillMaxSize()) { CircularProgressIndicator(Modifier.align(androidx.compose.ui.Alignment.Center)) }
            } else when (tab) {
                0 -> ScheduleTableScreen(rows)
                1 -> GraphScreen(rows)
                2 -> AuditScreen(projectId)
            }
        }
    }
}
