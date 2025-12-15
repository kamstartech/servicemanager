import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatStatusOneWord(status?: string | null, fallback = "UNKNOWN") {
  if (!status) return fallback
  const normalized = String(status).replace(/_/g, " ").trim()
  if (!normalized) return fallback
  const first = normalized.split(/\s+/)[0]
  return first.toUpperCase()
}

export function translateStatusOneWord(
  status: string | null | undefined,
  translate: (key: string) => string,
  fallback = "UNKNOWN",
) {
  const oneWord = formatStatusOneWord(status, fallback)
  const key = `common.status.${oneWord.toLowerCase()}`
  const translated = translate(key)
  const label = translated === key ? oneWord : translated
  return label.toUpperCase()
}
