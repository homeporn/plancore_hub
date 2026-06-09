import SwiftUI

@MainActor
final class ProjectListViewModel: ObservableObject {
    @Published var projects: [ProjectMeta] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let repo = ProjectsRepository()

    func load(userId: String) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            projects = try await repo.listProjectsWithMeta(userId: userId)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

struct ProjectListView: View {
    @EnvironmentObject var auth: AuthViewModel
    @StateObject private var vm = ProjectListViewModel()

    var body: some View {
        NavigationStack {
            List {
                if let error = vm.errorMessage {
                    Text(error).foregroundStyle(.red)
                }
                ForEach(vm.projects) { project in
                    NavigationLink(value: project) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(project.name).font(.headline)
                            Text("\(project.stage) · \(project.status)")
                                .font(.caption).foregroundStyle(.secondary)
                            Text("Задач: \(project.taskCount) · \(project.startDate ?? "—") – \(project.finishDate ?? "—")")
                                .font(.caption2).foregroundStyle(.secondary)
                        }
                    }
                }
            }
            .overlay { if vm.isLoading { ProgressView() } }
            .navigationTitle("Проекты")
            .navigationDestination(for: ProjectMeta.self) { ProjectDetailView(project: $0) }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Выйти") { Task { await auth.signOut() } }
                }
            }
            .refreshable { await reload() }
            .task { await reload() }
        }
    }

    private func reload() async {
        guard let userId = auth.userId else { return }
        await vm.load(userId: userId)
    }
}
