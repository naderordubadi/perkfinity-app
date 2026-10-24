package net.perkfinity.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.webkit.PermissionRequest;
import android.webkit.WebSettings;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AndroidCameraPermissionPlugin.class);
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

        // Ensure video elements playing camera stream do not require synchronous user gestures.
        getBridge().getWebView().getSettings()
            .setMediaPlaybackRequiresUserGesture(false);

        // Grant WebView media (camera) permission requests immediately when OS permission is granted,
        // while preserving Capacitor's built-in file picker, alerts, and fallback handlers.
        getBridge().getWebView().setWebChromeClient(new BridgeWebChromeClient(getBridge()) {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    boolean needsCamera = false;
                    for (String res : request.getResources()) {
                        if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(res)) {
                            needsCamera = true;
                            break;
                        }
                    }

                    if (needsCamera) {
                        if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                            request.grant(request.getResources());
                            return;
                        }
                    }
                    super.onPermissionRequest(request);
                });
            }
        });
    }
}
