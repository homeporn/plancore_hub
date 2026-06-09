import SwiftUI

@MainActor
final class ProjectDetailViewModel: ObservableObject {
    @Published var rows: [ScheduleRow] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let repo = ProjectsRepository()

    func load(projectId: String) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            rows = try await repo.loadCurrentScheduleRows(projectId: projectId)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

struct ProjectDetailView: View {
    let project: ProjectMeta
    @StateObject private var vm = ProjectDetailViewModel()

    var body: some View {
        TabView {
            ScheduleTableView(rows: vm.rows)
                .tabItem { Label("Таблица", systemImage: "tablecells") }

            GraphView(rows: vm.rows)
                .tabItem { Label("Граф", systemImage: "point.3.connected.trianglepath.dotted") }

            AuditView(projectId: project.id)
                .tabItem { Label("Аудит", systemImage: "checklist") }
        }
        .navigationTitle(project.name)
        .navigationBarTitleDisplayMode(.inline)
        .overlay { if vm.isLoading { ProgressView() } }
        .task { await vm.load(projectId: project.id) }
    }
}
