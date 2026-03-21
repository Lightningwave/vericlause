"use client";

import { useLanguage } from "./providers/language-provider";
import type { Locale } from "../lib/i18n/types";

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useLanguage();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="language-select" className="text-sm">
        {t("change_language")}:
      </label>
      <select
        id="language-select"
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="rounded border px-2 py-1 text-sm"
      >
        <option value="en">English</option>
        <option value="zh">中文</option>
        <option value="ms">Bahasa Melayu</option>
        <option value="ta">தமிழ்</option>
      </select>
    </div>
  );
}