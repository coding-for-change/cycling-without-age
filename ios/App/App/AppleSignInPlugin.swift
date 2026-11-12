import AuthenticationServices
import Capacitor

@objc(AppleSignInPlugin)
public class AppleSignInPlugin: CAPPlugin, CAPBridgedPlugin,
    ASAuthorizationControllerDelegate,
    ASAuthorizationControllerPresentationContextProviding
{
    public let identifier = "AppleSignInPlugin"
    public let jsName = "AppleSignIn"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "authorize", returnType: CAPPluginReturnPromise)
    ]

    private var pendingCall: CAPPluginCall?
    private var activeController: ASAuthorizationController?

    @objc func authorize(_ call: CAPPluginCall) {
        guard let nonce = call.getString("nonce"), !nonce.isEmpty else {
            call.reject("A nonce is required", "FAILED")
            return
        }
        let request = ASAuthorizationAppleIDProvider().createRequest()
        request.requestedScopes = [.fullName, .email]
        request.nonce = nonce

        DispatchQueue.main.async {
            self.pendingCall?.reject("Replaced by a newer request", "CANCELED")
            self.pendingCall = call
            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self
            controller.presentationContextProvider = self
            self.activeController = controller
            controller.performRequests()
        }
    }

    /// Hands the active call over exactly once; a late answer from a replaced sheet finds nothing.
    private func takePendingCall(for controller: ASAuthorizationController) -> CAPPluginCall? {
        guard controller === activeController else { return nil }
        defer {
            pendingCall = nil
            activeController = nil
        }
        return pendingCall
    }

    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        bridge?.webView?.window ?? ASPresentationAnchor()
    }

    public func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithAuthorization authorization: ASAuthorization
    ) {
        guard let call = takePendingCall(for: controller) else { return }
        guard
            let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
            let identityToken = credential.identityToken.flatMap({ String(data: $0, encoding: .utf8) }),
            let authorizationCode = credential.authorizationCode.flatMap({ String(data: $0, encoding: .utf8) })
        else {
            call.reject("Apple returned no identity token or authorization code", "FAILED")
            return
        }

        call.resolve([
            "identityToken": identityToken,
            "authorizationCode": authorizationCode,
            "givenName": credential.fullName?.givenName ?? "",
            "familyName": credential.fullName?.familyName ?? "",
        ])
    }

    public func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithError error: Error
    ) {
        guard let call = takePendingCall(for: controller) else { return }
        let canceled = (error as? ASAuthorizationError)?.code == .canceled
        call.reject(error.localizedDescription, canceled ? "CANCELED" : "FAILED")
    }
}
