package ai.plancore.mobile

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import ai.plancore.mobile.audit.AuditScreen
import ai.plancore.mobile.auth.AuthViewModel
import ai.plancore.mobile.auth.LoginScreen
import ai.plancore.mobile.projects.ProjectDetailScreen
import ai.plancore.mobile.projects.ProjectListScreen

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Surface {
                    val authVm: AuthViewModel = viewModel()
                    val auth by authVm.state.collectAsStateWithLifecycle()
                    androidx.compose.runtime.LaunchedEffect(Unit) { authVm.restore() }

                    if (auth.userId == null) {
                        LoginScreen(authVm)
                    } else {
                        AppNav(userId = auth.userId!!, onSignOut = authVm::signOut)
                    }
                }
            }
        }
    }
}

@androidx.compose.runtime.Composable
private fun AppNav(userId: String, onSignOut: () -> Unit) {
    val nav = rememberNavController()
    NavHost(navController = nav, startDestination = "projects") {
        composable("projects") {
            ProjectListScreen(
                userId = userId,
                onOpen = { id, name -> nav.navigate("project/$id/${java.net.URLEncoder.encode(name, "UTF-8")}") },
                onSignOut = onSignOut,
            )
        }
        composable("project/{id}/{name}") { backStack ->
            ProjectDetailScreen(
                projectId = backStack.arguments?.getString("id").orEmpty(),
                projectName = java.net.URLDecoder.decode(
                    backStack.arguments?.getString("name").orEmpty(), "UTF-8"
                ),
                onBack = { nav.popBackStack() },
            )
        }
    }
}
