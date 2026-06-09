package ai.plancore.mobile.projects

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import ai.plancore.mobile.data.ProjectMeta
import ai.plancore.mobile.data.ProjectsRepository
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProjectListScreen(
    userId: String,
    onOpen: (id: String, name: String) -> Unit,
    onSignOut: () -> Unit,
) {
    val repo = remember { ProjectsRepository() }
    val scope = rememberCoroutineScope()
    var projects by remember { mutableStateOf<List<ProjectMeta>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(userId) {
        loading = true; error = null
        runCatching { repo.listProjectsWithMeta(userId) }
            .onSuccess { projects = it }
            .onFailure { error = it.message }
        loading = false
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Проекты") },
                actions = { TextButton(onClick = onSignOut) { Text("Выйти") } },
            )
        }
    ) { padding ->
        Box(Modifier.padding(padding).fillMaxSize()) {
            when {
                loading -> CircularProgressIndicator(Modifier.align(androidx.compose.ui.Alignment.Center))
                error != null -> Text(error!!, Modifier.padding(16.dp), color = MaterialTheme.colorScheme.error)
                else -> LazyColumn(Modifier.fillMaxSize()) {
                    items(projects) { p ->
                        ListItem(
                            headlineContent = { Text(p.name) },
                            supportingContent = {
                                Column {
                                    Text("${p.stage} · ${p.status}", style = MaterialTheme.typography.bodySmall)
                                    Text(
                                        "Задач: ${p.taskCount} · ${p.startDate ?: "—"} – ${p.finishDate ?: "—"}",
                                        style = MaterialTheme.typography.labelSmall,
                                    )
                                }
                            },
                            modifier = Modifier.clickable { onOpen(p.id, p.name) },
                        )
                        HorizontalDivider()
                    }
                }
            }
        }
    }
}
