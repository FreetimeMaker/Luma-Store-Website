export type ClientPlatform = "Android" | "Windows" | "Linux" | "Other";

type NavigatorWithUaData = Navigator & {
  userAgentData?: {
    mobile?: boolean;
    platform?: string;
  };
};

export function detectClientPlatform(): ClientPlatform {
  if (typeof navigator === "undefined") return "Other";

  const nav = navigator as NavigatorWithUaData;
  const userAgent = (nav.userAgent || "").toLowerCase();
  const legacyPlatform = (nav.platform || "").toLowerCase();
  const uaDataPlatform = (nav.userAgentData?.platform || "").toLowerCase();
  const mobileHint = nav.userAgentData?.mobile === true || /\bmobile\b/.test(userAgent);
  const hasTouch = (nav.maxTouchPoints || 0) > 0;

  const explicitAndroid =
    /\bandroid\b/.test(userAgent)
    || uaDataPlatform === "android";

  const androidLinuxArm =
    hasTouch
    && (
      /linux.*(?:arm|aarch64)/.test(userAgent)
      || /linux.*(?:arm|aarch64)/.test(legacyPlatform)
      || /(?:armv\d+|aarch64)/.test(legacyPlatform)
    );

  const mobileLinuxFallback =
    mobileHint
    && (
      /\blinux\b/.test(userAgent)
      || /\blinux\b/.test(legacyPlatform)
      || uaDataPlatform === "linux"
    );

  if (explicitAndroid || androidLinuxArm || mobileLinuxFallback) return "Android";

  if (
    /\bwindows\b/.test(userAgent)
    || /\bwin(?:32|64)?\b/.test(legacyPlatform)
    || uaDataPlatform === "windows"
  ) {
    return "Windows";
  }

  if (
    /\blinux\b/.test(userAgent)
    || /\blinux\b/.test(legacyPlatform)
    || uaDataPlatform === "linux"
  ) {
    return "Linux";
  }

  return "Other";
}
