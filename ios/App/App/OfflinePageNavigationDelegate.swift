import WebKit

final class OfflinePageNavigationDelegate: NSObject, WKNavigationDelegate {
    private static let appLoadTimeoutSeconds: TimeInterval = 20
    private static let gatewayFailureStatusCodes = 502...599

    private let capacitorDelegate: WKNavigationDelegate
    private let appHost: String?
    private var appPageIsShowing = false
    private var pendingAppLoadTimeout: DispatchWorkItem?

    init(wrapping capacitorDelegate: WKNavigationDelegate, appURL: URL) {
        self.capacitorDelegate = capacitorDelegate
        self.appHost = appURL.host
        super.init()
    }

    override func responds(to selector: Selector!) -> Bool {
        super.responds(to: selector) || capacitorDelegate.responds(to: selector)
    }

    override func forwardingTarget(for selector: Selector!) -> Any? {
        capacitorDelegate.responds(to: selector) ? capacitorDelegate : nil
    }

    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
        if isAppPage(webView.url) && !appPageIsShowing {
            startAppLoadTimeout(for: webView)
        }
        capacitorDelegate.webView?(webView, didStartProvisionalNavigation: navigation)
    }

    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationResponse: WKNavigationResponse,
        decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void
    ) {
        if navigationResponse.isForMainFrame {
            stopAppLoadTimeout()
        }
        let canShowResponse = navigationResponse.canShowMIMEType && !isGatewayFailure(navigationResponse)
        decisionHandler(canShowResponse ? .allow : .cancel)
    }

    func webView(_ webView: WKWebView, didCommit navigation: WKNavigation!) {
        appPageIsShowing = isAppPage(webView.url)
        capacitorDelegate.webView?(webView, didCommit: navigation)
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        stopAppLoadTimeout()
        capacitorDelegate.webView?(webView, didFailProvisionalNavigation: navigation, withError: error)
    }

    private func isGatewayFailure(_ navigationResponse: WKNavigationResponse) -> Bool {
        guard navigationResponse.isForMainFrame,
              let response = navigationResponse.response as? HTTPURLResponse else {
            return false
        }
        return Self.gatewayFailureStatusCodes.contains(response.statusCode)
    }

    private func isAppPage(_ url: URL?) -> Bool {
        guard let host = url?.host, let appHost = appHost else {
            return false
        }
        return host.caseInsensitiveCompare(appHost) == .orderedSame
    }

    private func startAppLoadTimeout(for webView: WKWebView) {
        stopAppLoadTimeout()
        let timeout = DispatchWorkItem { [weak webView] in
            webView?.stopLoading()
        }
        pendingAppLoadTimeout = timeout
        DispatchQueue.main.asyncAfter(deadline: .now() + Self.appLoadTimeoutSeconds, execute: timeout)
    }

    private func stopAppLoadTimeout() {
        pendingAppLoadTimeout?.cancel()
        pendingAppLoadTimeout = nil
    }
}
