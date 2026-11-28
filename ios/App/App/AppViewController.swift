import UIKit
import Capacitor

class AppViewController: CAPBridgeViewController {
    private var offlinePageNavigationDelegate: OfflinePageNavigationDelegate?

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        webView?.allowsBackForwardNavigationGestures = false
        webView?.scrollView.bounces = true
        webView?.scrollView.alwaysBounceVertical = true
        bridge?.registerPluginInstance(SwipeBackPlugin())
        bridge?.registerPluginInstance(ShellBackgroundPlugin())
        bridge?.registerPluginInstance(AppleSignInPlugin())
        showOfflinePageWhenTheAppCannotLoad()
    }

    private func showOfflinePageWhenTheAppCannotLoad() {
        guard let webView = webView,
              let capacitorDelegate = webView.navigationDelegate,
              let appURL = bridge?.config.serverURL else {
            return
        }
        let delegate = OfflinePageNavigationDelegate(wrapping: capacitorDelegate, appURL: appURL)
        offlinePageNavigationDelegate = delegate
        webView.navigationDelegate = delegate
    }
}
