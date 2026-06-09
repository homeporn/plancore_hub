import SwiftUI

struct LoginView: View {
    @EnvironmentObject var auth: AuthViewModel
    @State private var email = ""
    @State private var password = ""

    var body: some View {
        VStack(spacing: 16) {
            Spacer()
            Text("PlanCore")
                .font(.largeTitle).bold()
            Text("Просмотр графиков проектов")
                .foregroundStyle(.secondary)

            TextField("Email", text: $email)
                .textContentType(.emailAddress)
                .keyboardType(.emailAddress)
                .autocapitalization(.none)
                .textFieldStyle(.roundedBorder)

            SecureField("Пароль", text: $password)
                .textContentType(.password)
                .textFieldStyle(.roundedBorder)

            if let error = auth.errorMessage {
                Text(error).foregroundStyle(.red).font(.footnote)
            }

            Button {
                Task { await auth.signIn(email: email, password: password) }
            } label: {
                if auth.isLoading {
                    ProgressView()
                } else {
                    Text("Войти").frame(maxWidth: .infinity)
                }
            }
            .buttonStyle(.borderedProminent)
            .disabled(auth.isLoading || email.isEmpty || password.isEmpty)

            Spacer()
        }
        .padding()
    }
}
