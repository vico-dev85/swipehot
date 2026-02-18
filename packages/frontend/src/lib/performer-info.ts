/**
 * Smart performer info line — builds a human-readable summary
 * from available data (age, country, languages).
 * Returns null when no legit data → caller shows room_subject instead.
 */

// Country code → flag emoji + name (top 30 Chaturbate countries)
const COUNTRIES: Record<string, [string, string]> = {
  US: ["🇺🇸", "USA"],
  CO: ["🇨🇴", "Colombia"],
  RO: ["🇷🇴", "Romania"],
  RU: ["🇷🇺", "Russia"],
  UA: ["🇺🇦", "Ukraine"],
  GB: ["🇬🇧", "UK"],
  ES: ["🇪🇸", "Spain"],
  MX: ["🇲🇽", "Mexico"],
  BR: ["🇧🇷", "Brazil"],
  DE: ["🇩🇪", "Germany"],
  FR: ["🇫🇷", "France"],
  IT: ["🇮🇹", "Italy"],
  CA: ["🇨🇦", "Canada"],
  AU: ["🇦🇺", "Australia"],
  NL: ["🇳🇱", "Netherlands"],
  PL: ["🇵🇱", "Poland"],
  CZ: ["🇨🇿", "Czech Republic"],
  AR: ["🇦🇷", "Argentina"],
  CL: ["🇨🇱", "Chile"],
  PE: ["🇵🇪", "Peru"],
  PH: ["🇵🇭", "Philippines"],
  TH: ["🇹🇭", "Thailand"],
  JP: ["🇯🇵", "Japan"],
  KR: ["🇰🇷", "South Korea"],
  IN: ["🇮🇳", "India"],
  ZA: ["🇿🇦", "South Africa"],
  NZ: ["🇳🇿", "New Zealand"],
  SE: ["🇸🇪", "Sweden"],
  LT: ["🇱🇹", "Lithuania"],
  LV: ["🇱🇻", "Latvia"],
  EE: ["🇪🇪", "Estonia"],
  HU: ["🇭🇺", "Hungary"],
  PT: ["🇵🇹", "Portugal"],
  VE: ["🇻🇪", "Venezuela"],
  EC: ["🇪🇨", "Ecuador"],
};

function isLegitAge(age: number | null): age is number {
  return age !== null && age >= 18 && age <= 69;
}

function isLegitCountry(code: string): boolean {
  return code.length === 2 && code in COUNTRIES;
}

function formatLanguages(raw: string): string | null {
  if (!raw || !raw.trim()) return null;
  // Chaturbate sends space-separated: "English Spanish"
  const langs = raw.trim().split(/\s+/).filter(Boolean);
  if (langs.length === 0) return null;
  if (langs.length === 1) return langs[0];
  if (langs.length === 2) return `${langs[0]} and ${langs[1]}`;
  return langs.slice(0, -1).join(", ") + " and " + langs[langs.length - 1];
}

export interface InfoLine {
  text: string;
  hasData: boolean; // true = real data, false = fallback to room_subject
}

export function buildInfoLine(
  age: number | null,
  country: string,
  spokenLanguages: string,
): InfoLine {
  const hasAge = isLegitAge(age);
  const hasCountry = isLegitCountry(country);
  const langStr = formatLanguages(spokenLanguages);
  const hasLang = langStr !== null;

  const countryInfo = hasCountry ? COUNTRIES[country] : null;

  // All three
  if (hasAge && hasCountry && hasLang) {
    return { text: `${age} · from ${countryInfo![1]} ${countryInfo![0]} · ${langStr}`, hasData: true };
  }
  // Age + country
  if (hasAge && hasCountry) {
    return { text: `${age} · from ${countryInfo![1]} ${countryInfo![0]}`, hasData: true };
  }
  // Age + language
  if (hasAge && hasLang) {
    return { text: `${age} · speaks ${langStr}`, hasData: true };
  }
  // Country + language
  if (hasCountry && hasLang) {
    return { text: `From ${countryInfo![1]} ${countryInfo![0]} · ${langStr}`, hasData: true };
  }
  // Age only
  if (hasAge) {
    return { text: `${age} years old`, hasData: true };
  }
  // Country only
  if (hasCountry) {
    return { text: `From ${countryInfo![1]} ${countryInfo![0]}`, hasData: true };
  }
  // Language only
  if (hasLang) {
    return { text: `Speaks ${langStr}`, hasData: true };
  }

  // Nothing legit
  return { text: "", hasData: false };
}
