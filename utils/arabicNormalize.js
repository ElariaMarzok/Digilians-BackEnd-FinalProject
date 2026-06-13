export const ARABIC_DIACRITICS_REGEX = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;

export const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const normalizeArabicSearchText = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(ARABIC_DIACRITICS_REGEX, "")
    .replace(/[\u0623\u0625\u0622\u0671]/g, "\u0627")
    .replace(/[\u0649\u0626]/g, "\u064a")
    .replace(/[\u0624]/g, "\u0648")
    .replace(/\s+/g, " ")
    .trim();

export const buildArabicFlexibleRegex = (value = "") => {
  const normalizedValue = normalizeArabicSearchText(value);
  const groups = {
    "\u0627": "[\u0627\u0623\u0625\u0622\u0671]",
    "\u064a": "[\u064a\u0649\u0626]",
    "\u0648": "[\u0648\u0624]",
  };

  return normalizedValue
    .split("")
    .map((character) => {
      if (character === " ") {
        return "\\s+";
      }

      return groups[character] || escapeRegex(character);
    })
    .join("");
};
