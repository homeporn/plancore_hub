import Foundation

/// Backend configuration, read from Info.plist keys that are populated from
/// Secrets.xcconfig at build time. The publishable key is a client-side key
/// (safe to ship); RLS enforces per-user access on the backend.
enum AppConfig {
    static var supabaseURL: String {
        value(for: "SUPABASE_URL")
    }

    static var supabasePublishableKey: String {
        value(for: "SUPABASE_PUBLISHABLE_KEY")
    }

    private static func value(for key: String) -> String {
        guard let raw = Bundle.main.object(forInfoDictionaryKey: key) as? String,
              !raw.isEmpty else {
            fatalError("Missing \(key). Copy Secrets.xcconfig.example to Secrets.xcconfig.")
        }
        // xcconfig stores URLs without scheme to avoid `//` comment parsing;
        // re-add https:// when needed.
        if key == "SUPABASE_URL", !raw.hasPrefix("http") {
            return "https://\(raw)"
        }
        return raw
    }
}
