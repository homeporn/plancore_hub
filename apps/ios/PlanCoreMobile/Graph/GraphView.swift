import SwiftUI

/// Read-only canvas view of the logic network. Builds the graph from schedule
/// rows, lays it out with the ported GraphLayoutEngine, and renders nodes +
/// dependency edges with pinch-to-zoom and pan.
struct GraphView: View {
    let rows: [ScheduleRow]

    @State private var scale: CGFloat = 1
    @State private var offset: CGSize = .zero
    @GestureState private var gestureScale: CGFloat = 1
    @GestureState private var gestureOffset: CGSize = .zero

    private var layout: GraphLayout {
        GraphLayoutEngine.layout(GraphBuilder.build(from: rows))
    }

    var body: some View {
        let layout = layout
        let nodeById = Dictionary(uniqueKeysWithValues: layout.nodes.map { ($0.id, $0) })

        return GeometryReader { _ in
            ZStack {
                edgeLayer(layout: layout, nodeById: nodeById)
                nodeLayer(layout: layout)
            }
            .frame(width: layout.width, height: layout.height)
            .scaleEffect(scale * gestureScale)
            .offset(x: offset.width + gestureOffset.width, y: offset.height + gestureOffset.height)
            .gesture(
                MagnificationGesture()
                    .updating($gestureScale) { value, state, _ in state = value }
                    .onEnded { scale *= $0 }
            )
            .simultaneousGesture(
                DragGesture()
                    .updating($gestureOffset) { value, state, _ in state = value.translation }
                    .onEnded { offset.width += $0.translation.width; offset.height += $0.translation.height }
            )
        }
        .clipped()
        .overlay(alignment: .bottom) {
            if rows.isEmpty {
                Text("Нет данных графика").foregroundStyle(.secondary).padding()
            }
        }
    }

    private func edgeLayer(layout: GraphLayout, nodeById: [String: PositionedNode]) -> some View {
        Canvas { ctx, _ in
            for edge in layout.edges {
                guard let s = nodeById[edge.source], let t = nodeById[edge.target] else { continue }
                let from = CGPoint(x: s.x + s.width, y: s.y + s.height / 2)
                let to = CGPoint(x: t.x, y: t.y + t.height / 2)
                var path = Path()
                path.move(to: from)
                path.addLine(to: to)
                ctx.stroke(path, with: .color(.gray), lineWidth: 1)
            }
        }
        .frame(width: layout.width, height: layout.height)
    }

    private func nodeLayer(layout: GraphLayout) -> some View {
        ForEach(layout.nodes) { node in
            VStack(alignment: .leading, spacing: 2) {
                Text(node.node.sdr).font(.caption2).foregroundStyle(.secondary)
                Text(node.node.name).font(.caption).lineLimit(2)
            }
            .padding(6)
            .frame(width: node.width, height: node.height, alignment: .topLeading)
            .background(node.node.isMilestone ? Color.orange.opacity(0.2) : Color.blue.opacity(0.1))
            .overlay(RoundedRectangle(cornerRadius: 6).stroke(Color.gray.opacity(0.5)))
            .clipShape(RoundedRectangle(cornerRadius: 6))
            .position(x: node.x + node.width / 2, y: node.y + node.height / 2)
        }
    }
}
