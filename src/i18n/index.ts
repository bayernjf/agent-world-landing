import { ui, defaultLang, type Lang, type UIKey } from "./ui";

// A missing zh key falls back to English at runtime; this makes it a build error
// instead, so the fallback only ever covers genuine gaps rather than typos.
const dicts = ui satisfies Record<Lang, Record<UIKey, string>>;

export { languages, defaultLang, type Lang, type UIKey } from "./ui";

export function getLangFromUrl(url: URL): Lang {
  const [, first] = url.pathname.split("/");
  return first in dicts ? (first as Lang) : defaultLang;
}

export function useTranslations(lang: Lang) {
  return function t(key: UIKey): string {
    return dicts[lang][key] ?? dicts[defaultLang][key] ?? key;
  };
}

/** Substitutes {placeholders} in a translated string. */
export function fmt(tpl: string, vars: Record<string, string | number>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

/** The default locale is unprefixed, so `/` and `/zh/` are the only two shapes. */
export function localizePath(path: string, lang: Lang): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return lang === defaultLang ? clean : `/${lang}${clean}`;
}

export function getOtherLang(lang: Lang): Lang {
  return lang === "zh" ? "en" : "zh";
}

export function getAltLangPath(url: URL, lang: Lang): string {
  const stripped = url.pathname.replace(new RegExp(`^/${lang}(?=/|$)`), "") || "/";
  return localizePath(stripped, getOtherLang(lang));
}
