package ai.plancore.mobile.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import ai.plancore.mobile.data.Supabase
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.gotrue.providers.builtin.Email
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class AuthState(
    val userId: String? = null,
    val isLoading: Boolean = false,
    val error: String? = null,
)

/**
 * Owns the Supabase auth session. The auth-kt SDK persists the session and
 * refreshes the JWT automatically; [restore] reads whatever is stored.
 */
class AuthViewModel : ViewModel() {
    private val auth = Supabase.client.auth

    private val _state = MutableStateFlow(AuthState())
    val state: StateFlow<AuthState> = _state.asStateFlow()

    fun restore() {
        viewModelScope.launch {
            auth.awaitInitialization()
            _state.value = _state.value.copy(userId = auth.currentUserOrNull()?.id)
        }
    }

    fun signIn(email: String, password: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)
            try {
                auth.signInWith(Email) {
                    this.email = email
                    this.password = password
                }
                _state.value = AuthState(userId = auth.currentUserOrNull()?.id)
            } catch (e: Exception) {
                _state.value = _state.value.copy(isLoading = false, error = e.message ?: "Ошибка входа")
            }
        }
    }

    fun signOut() {
        viewModelScope.launch {
            runCatching { auth.signOut() }
            _state.value = AuthState()
        }
    }
}
