import type { Locale } from "../config";
import { en } from "./en";
import { pt } from "./pt";

const dictionaries = {
  en,
  pt,
} as const;

export function getDictionary(locale: Locale) {
  return dictionaries[locale] ?? dictionaries.en;
}
