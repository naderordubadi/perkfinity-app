package net.perkfinity.app;

import android.os.Build;
import android.os.Bundle;
import android.view.View;
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
    }
}

