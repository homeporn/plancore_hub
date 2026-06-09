import Foundation
import Supabase

/// Single shared Supabase client. The host app owns construction and session
/// handling (mirrors the contract in packages/data/src/supabase/client.ts).
/// URL and publishable key come from AppConfig (Secrets.xcconfig → Info.plist).
enum SupabaseClientProvider {
    static let shared: SupabaseClient = {
        guard let url = URL(string: AppConfig.supabaseURL) else {
            fatalError("Invalid SUPABASE_URL in configuration")
        }
        return SupabaseClient(
            supabaseURL: url,
            supabaseKey: AppConfig.supabasePublishableKey
        )
    }()
}
