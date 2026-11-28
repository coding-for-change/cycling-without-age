package com.codingforchange.cwa;

import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebViewClient;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;

public class OfflinePageWebViewClient extends BridgeWebViewClient {

    private static final long APP_LOAD_TIMEOUT_MS = 20_000;
    private static final String SPLASH_SCREEN_PLUGIN = "SplashScreen";

    private final Bridge bridge;
    private final String appHost;
    private final Handler mainThread = new Handler(Looper.getMainLooper());
    private final Runnable showOfflinePage = this::showOfflinePage;
    private volatile boolean appPageIsShowing = false;

    public OfflinePageWebViewClient(Bridge bridge) {
        super(bridge);
        this.bridge = bridge;
        this.appHost = Uri.parse(bridge.getAppUrl()).getHost();
        startAppLoadTimeout();
    }

    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        if (request.isForMainFrame() && isAppPage(request.getUrl()) && !appPageIsShowing) {
            startAppLoadTimeout();
        }
        return super.shouldInterceptRequest(view, request);
    }

    @Override
    public void onPageStarted(WebView view, String url, Bitmap favicon) {
        stopAppLoadTimeout();
        appPageIsShowing = url != null && isAppPage(Uri.parse(url));
        super.onPageStarted(view, url, favicon);
    }

    @Override
    public void onPageCommitVisible(WebView view, String url) {
        super.onPageCommitVisible(view, url);
        if (url.equals(bridge.getErrorUrl())) {
            hideSplashScreen();
        }
    }

    @Override
    public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse errorResponse) {
        boolean appRendersItsOwnErrorPage = request.isForMainFrame() && !isGatewayFailure(errorResponse.getStatusCode());
        if (appRendersItsOwnErrorPage) {
            return;
        }
        super.onReceivedHttpError(view, request, errorResponse);
    }

    private boolean isAppPage(Uri url) {
        return appHost != null && appHost.equalsIgnoreCase(url.getHost());
    }

    private static boolean isGatewayFailure(int statusCode) {
        return statusCode >= 502 && statusCode <= 599;
    }

    private void startAppLoadTimeout() {
        mainThread.removeCallbacks(showOfflinePage);
        mainThread.postDelayed(showOfflinePage, APP_LOAD_TIMEOUT_MS);
    }

    private void stopAppLoadTimeout() {
        mainThread.removeCallbacks(showOfflinePage);
    }

    private void showOfflinePage() {
        WebView webView = bridge.getWebView();
        webView.stopLoading();
        webView.loadUrl(bridge.getErrorUrl());
    }

    private void hideSplashScreen() {
        if (bridge.getPlugin(SPLASH_SCREEN_PLUGIN) == null) {
            return;
        }
        bridge.callPluginMethod(SPLASH_SCREEN_PLUGIN, "hide", new UnansweredPluginCall(SPLASH_SCREEN_PLUGIN, "hide"));
    }

    private static final class UnansweredPluginCall extends PluginCall {

        UnansweredPluginCall(String pluginId, String methodName) {
            super(null, pluginId, CALLBACK_ID_DANGLING, methodName, new JSObject());
        }

        @Override
        public void resolve() {}

        @Override
        public void resolve(JSObject data) {}

        @Override
        public void errorCallback(String message) {}

        @Override
        public void reject(String message, String code, Exception exception, JSObject data) {}
    }
}
