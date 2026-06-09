import SwiftUI

@main
struct PlanCoreMobileApp: App {
    @StateObject private var auth = AuthViewModel()

    var body: some Scene {
        WindowGroup {
            Group {
                if auth.session != nil {
                    ProjectListView()
                } else {
                    LoginView()
                }
            }
            .environmentObject(auth)
            .task { await auth.restore() }
        }
    }
}
