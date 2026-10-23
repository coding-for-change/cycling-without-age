import Capacitor
import UIKit

@objc(ShellBackgroundPlugin)
public class ShellBackgroundPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ShellBackgroundPlugin"
    public let jsName = "ShellBackground"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "set", returnType: CAPPluginReturnPromise)
    ]

    @objc func set(_ call: CAPPluginCall) {
        guard let color = UIColor(hex: call.getString("color", "")) else {
            call.reject("invalid color")
            return
        }
        let dark = call.getBool("dark", false)
        DispatchQueue.main.async {
            guard let webView = self.bridge?.webView else {
                call.resolve()
                return
            }
            webView.window?.overrideUserInterfaceStyle = dark ? .dark : .light
            webView.backgroundColor = color
            webView.scrollView.backgroundColor = color
            webView.underPageBackgroundColor = color
            var view = webView.superview
            while let current = view, !(current is UIWindow) {
                current.backgroundColor = color
                view = current.superview
            }
            call.resolve()
        }
    }
}

private extension UIColor {
    convenience init?(hex: String) {
        let digits = hex.hasPrefix("#") ? String(hex.dropFirst()) : hex
        guard digits.count == 6, let value = UInt32(digits, radix: 16) else { return nil }
        self.init(
            red: CGFloat((value >> 16) & 0xFF) / 255,
            green: CGFloat((value >> 8) & 0xFF) / 255,
            blue: CGFloat(value & 0xFF) / 255,
            alpha: 1
        )
    }
}
