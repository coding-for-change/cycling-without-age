import Capacitor

@objc(SwipeBackPlugin)
public class SwipeBackPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SwipeBackPlugin"
    public let jsName = "SwipeBack"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setEnabled", returnType: CAPPluginReturnPromise)
    ]

    @objc func setEnabled(_ call: CAPPluginCall) {
        let enabled = call.getBool("enabled", false)
        DispatchQueue.main.async {
            self.bridge?.webView?.allowsBackForwardNavigationGestures = enabled
            call.resolve()
        }
    }
}
