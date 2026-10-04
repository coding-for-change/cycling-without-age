import UIKit
import Capacitor

class AppViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        webView?.allowsBackForwardNavigationGestures = false
        webView?.scrollView.bounces = true
        webView?.scrollView.alwaysBounceVertical = true
        bridge?.registerPluginInstance(SwipeBackPlugin())
    }
}
