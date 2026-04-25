const serverUrl = process.env.CAPACITOR_SERVER_URL || "https://prompt.omniacreata.com";

const config = {
  appId: "com.omniacreata.omniaprompt",
  appName: "OmniaPrompt",
  webDir: "public",
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith("http://"),
    androidScheme: "https",
    allowNavigation: ["prompt.omniacreata.com", "*.omniacreata.com"]
  },
  android: {
    backgroundColor: "#f6efe3"
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#f6efe3",
      androidScaleType: "CENTER_INSIDE",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#f6efe3",
      overlaysWebView: true
    },
    Keyboard: {
      resize: "body",
      resizeOnFullScreen: true
    }
  }
};

export default config;
