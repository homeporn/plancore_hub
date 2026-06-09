import SwiftUI

/// Read-only tabular view of the schedule rows. Horizontally scrollable so the
/// key columns (СДР, наименование, даты, длительность, %, ответственный) stay
/// legible on phone screens.
struct ScheduleTableView: View {
    let rows: [ScheduleRow]

    var body: some View {
        ScrollView([.horizontal, .vertical]) {
            VStack(alignment: .leading, spacing: 0) {
                headerRow
                Divider()
                ForEach(rows) { row in
                    dataRow(row)
                    Divider()
                }
            }
            .padding(.horizontal, 8)
        }
    }

    private var headerRow: some View {
        HStack(spacing: 0) {
            cell("СДР", width: 90, bold: true)
            cell("Наименование", width: 220, bold: true)
            cell("Тип", width: 130, bold: true)
            cell("Начало", width: 100, bold: true)
            cell("Окончание", width: 100, bold: true)
            cell("Дл.", width: 50, bold: true)
            cell("%", width: 50, bold: true)
            cell("Ответственный", width: 160, bold: true)
        }
    }

    private func dataRow(_ row: ScheduleRow) -> some View {
        HStack(spacing: 0) {
            cell(row.sdr, width: 90)
            cell(row.name, width: 220, bold: row.rowType == "заголовок")
            cell(row.rowType, width: 130)
            cell(row.plannedStart ?? "—", width: 100)
            cell(row.plannedFinish ?? "—", width: 100)
            cell(row.plannedDuration.map(String.init) ?? "—", width: 50)
            cell(row.percentComplete.map { "\(Int($0))" } ?? "—", width: 50)
            cell(row.responsible, width: 160)
        }
    }

    private func cell(_ text: String, width: CGFloat, bold: Bool = false) -> some View {
        Text(text)
            .font(.caption)
            .fontWeight(bold ? .semibold : .regular)
            .lineLimit(1)
            .frame(width: width, alignment: .leading)
            .padding(.vertical, 6)
            .padding(.horizontal, 4)
    }
}
