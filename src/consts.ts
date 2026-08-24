/** Site-level constants. The SEO component, sitemap and Astro config all read
 *  from here so the public URL only ever lives in one place. */

export const SITE_URL = "https://agent-world.bayjf.com";

export const SITE_NAME = "Agent World";
export const AUTHOR = "bayernjf";

export const SOCIAL = {
  github: "https://github.com/bayernjf/agent-world",
  email: "b4yernjf@gmail.com",
} as const;

export const BRAND_MARK = "/brand/agent-world-mark.svg";

export const LOCALES = ["en", "zh"] as const;
export const DEFAULT_LOCALE = "en";

/** Built by scripts/shot.mjs at the end of every build, so the share cards
 *  track the real page instead of a hand-maintained asset that goes stale. */
export const OG_IMAGE = {
  en: "/preview-en.png",
  zh: "/preview-zh.png",
} as const;

export const OG_IMAGE_SIZE = { width: 1280, height: 800 } as const;
