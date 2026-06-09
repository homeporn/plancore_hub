import SwiftUI

@MainActor
final class AuditViewModel: ObservableObject {
    @Published var run: AuditRun?
    @Published var findings: [AuditFinding] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let repo = AuditRepository()

    func load(projectId: String) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            run = try await repo.latestRun(projectId: projectId)
            if let runId = run?.id {
                findings = try await repo.findings(auditRunId: runId)
            } else {
                findings = []
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

struct AuditView: View {
    let projectId: String
    @StateObject private var vm = AuditViewModel()

    var body: some View {
        List {
            if let error = vm.errorMessage {
                Text(error).foregroundStyle(.red)
            }
            if let run = vm.run {
                Section("Последний аудит") {
                    Text(run.summary.isEmpty ? "Прогон от \(run.created_at)" : run.summary)
                        .font(.subheadline)
                    Text("Статус: \(run.status) · Серьёзность: \(run.severity)")
                        .font(.caption).foregroundStyle(.secondary)
                }
            } else if !vm.isLoading {
                Text("Аудит ещё не запускался").foregroundStyle(.secondary)
            }

            if !vm.findings.isEmpty {
                Section("Находки (\(vm.findings.count))") {
                    ForEach(vm.findings) { f in
                        VStack(alignment: .leading, spacing: 2) {
                            Text(f.summary).font(.subheadline)
                            Text("\(f.rule_code) · \(f.severity)")
                                .font(.caption).foregroundStyle(severityColor(f.severity))
                            if !f.details.isEmpty {
                                Text(f.details).font(.caption2).foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }
        }
        .overlay { if vm.isLoading { ProgressView() } }
        .task { await vm.load(projectId: projectId) }
    }

    private func severityColor(_ severity: String) -> Color {
        switch severity.lowercased() {
        case "error", "critical", "high": return .red
        case "warning", "medium": return .orange
        default: return .secondary
        }
    }
}
