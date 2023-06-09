import pkg from "../package.json";

const sharedManifest = {
  default_locale: "en",
  icons: {
    16: "icons/16.png",
    32: "icons/32.png",
    48: "icons/48.png",
  },
  options_ui: {
    page: "src/entries/options/index.html",
    open_in_tab: true,
  },
  permissions: ["menus", "activeTab", "storage", "contextMenus"],
};

const browserAction = {
  default_icon: {
    16: "icons/16.png",
    32: "icons/32.png",
    48: "icons/48.png",
  },
  default_popup: "src/entries/popup/index.html",
};

const ManifestV2 = {
  ...sharedManifest,
  background: {
    scripts: ["src/entries/background/script.ts"],
    persistent: false,
  },
  browser_action: browserAction,
  options_ui: {
    ...sharedManifest.options_ui,
    chrome_style: false,
  },
  permissions: [...sharedManifest.permissions, "*://*/*"],
  web_accessible_resources: ["_locales/*/messages.json"],
};

const ManifestV3 = {
  ...sharedManifest,
  action: browserAction,
  background: {
    service_worker: "src/entries/background/serviceWorker.ts",
  },
  host_permissions: ["*://*/*"],
  permissions: [],
  web_accessible_resources: [
    {
      resources: ["_locales/*/messages.json"],
      matches: ["*://*/*"],
    },
  ],
};

export function getManifest(manifestVersion: number, isDevelopment: boolean = false): chrome.runtime.Manifest {
  const manifest = {
    author: pkg.author,
    description: pkg.description,
    name: pkg.displayName ?? pkg.name,
    version: pkg.version,
  };

  if (manifestVersion === 2) {
    if (isDevelopment) {
      return {
        ...manifest,
        ...ManifestV2,
        manifest_version: manifestVersion,
        permissions: [...ManifestV2.permissions, "http://*/*", "https://*/*"],
        browser_specific_settings: {
          gecko: {
            id: "your-addon-id@example.com",
          },
        },
      };
    }
    return {
      ...manifest,
      ...ManifestV2,
      manifest_version: manifestVersion,
    };
  }

  if (manifestVersion === 3) {
    return {
      ...manifest,
      ...ManifestV3,
      manifest_version: manifestVersion,
    };
  }

  throw new Error(
    `Missing manifest definition for manifestVersion ${manifestVersion}`
  );
}
