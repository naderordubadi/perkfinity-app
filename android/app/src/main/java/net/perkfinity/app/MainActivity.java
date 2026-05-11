package net.perkfinity.app;

import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Enable Android Autofill Framework (API 26+) on the Capacitor WebView.
        // Without this, Google Password Manager / Samsung Pass cannot detect
        // credential fields inside the WebView and will never offer to save
        // or auto-fill email + password.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getBridge().getWebView().setImportantForAutofill(
                View.IMPORTANT_FOR_AUTOFILL_YES
            );
        }

        // Allow HTTP API calls from the HTTPS WebView context.
        // In production all API calls go to HTTPS so this is a no-op there.
        // Required in dev where the local backend runs on http://192.168.x.x:3001.
        getBridge().getWebView().getSettings()
            .setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

        // Grant WebView media (camera) permission requests so that
        // navigator.mediaDevices.getUserMedia() works on Android.
        // Without this override, getUserMedia always throws NotAllowedError
        // even when the OS camera permission is granted.
        getBridge().getWebView().setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> request.grant(request.getResources()));
            }
        });
    }
}
