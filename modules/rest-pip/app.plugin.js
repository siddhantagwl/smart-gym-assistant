// Lets MainActivity go picture-in-picture without being recreated (which would
// reload the JS app): supportsPictureInPicture + the PiP size configChanges.
const { withAndroidManifest, AndroidConfig } = require("expo/config-plugins");

const PIP_CONFIG_CHANGES = ["screenSize", "smallestScreenSize", "screenLayout", "orientation"];

module.exports = function withRestPip(config) {
  return withAndroidManifest(config, (cfg) => {
    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(cfg.modResults);
    activity.$["android:supportsPictureInPicture"] = "true";
    const current = (activity.$["android:configChanges"] || "").split("|").filter(Boolean);
    for (const c of PIP_CONFIG_CHANGES) if (!current.includes(c)) current.push(c);
    activity.$["android:configChanges"] = current.join("|");
    return cfg;
  });
};
