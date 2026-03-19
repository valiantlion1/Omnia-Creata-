const serverUrl = process.env.CAPACITOR_SERVER_URL || "https://vault.omniacreata.com";

const config = {
  appId: "com.omniacreata.vault",
  appName: "Vault",
  webDir: "public",
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith("http://"),
    androidScheme: "https",
    allowNavigation: ["vault.omniacreata.com", "*.omniacreata.com"]
  },
  android: {
    backgroundColor: "#000000"
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#000000",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#000000",
      overlaysWebView: true
    },
    Keyboard: {
      resize: "body",
      resizeOnFullScreen: true
    }
  }
};

export default config;
