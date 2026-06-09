import Foundation
import Supabase

/// Owns the Supabase auth session. supabase-swift persists the session in the
/// Keychain automatically and refreshes the JWT, so `restore()` simply reads
/// whatever is stored.
@MainActor
final class AuthViewModel: ObservableObject {
    @Published var session: Session?
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let client = SupabaseClientProvider.shared

    var userId: String? { session?.user.id.uuidString.lowercased() }

    func restore() async {
        session = try? await client.auth.session
    }

    func signIn(email: String, password: String) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            session = try await client.auth.signIn(email: email, password: password)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func signOut() async {
        try? await client.auth.signOut()
        session = nil
    }
}
