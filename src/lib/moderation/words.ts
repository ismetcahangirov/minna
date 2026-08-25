import "server-only";

/**
 * Profanity vocabulary for the community features (COMM-05).
 *
 * Kept in one server-only module so the lists are never shipped to the browser
 * and every writing surface — community threads, replies and episode reviews —
 * blocks exactly the same vocabulary. Entries are lowercase and written without
 * diacritics or repeated letters, because {@link normalize} folds the text the
 * same way before matching.
 *
 * Coverage is EN / TR / AZ / RU: the interface is EN/TR/RU and most of the
 * audience also writes Azerbaijani.
 */

/**
 * Matched on word boundaries, against text that still has its separators.
 * Short or ambiguous entries belong here — never in {@link COMPACT_TERMS} —
 * so "sik" blocks the insult without touching "sikh" or a longer word that
 * merely contains those letters.
 */
export const BOUNDED_TERMS: readonly string[] = [
  // English
  "fuck",
  "fucks",
  "fucker",
  "fuckers",
  "fucking",
  "fuckin",
  "motherfucker",
  "shit",
  "shits",
  "shitty",
  "bullshit",
  "bitch",
  "bitches",
  "bastard",
  "asshole",
  "arsehole",
  "arse",
  "dickhead",
  "dumbass",
  "jackass",
  "cunt",
  "whore",
  "slut",
  "nigger",
  "niggers",
  "nigga",
  "niggas",
  "faggot",
  "fags",
  "retard",
  "retarded",
  "wanker",
  "twat",
  "bollocks",
  "prick",
  "pussy",
  "cocksucker",
  // Turkish
  "amk",
  "amq",
  "aq",
  "amina",
  "aminakoyayim",
  "amcik",
  "amcigi",
  "sik",
  "siker",
  "sikeyim",
  "sikerim",
  "sikik",
  "siktir",
  "siktirgit",
  "pic",
  "orospu",
  "orospucocugu",
  "oruspu",
  "yarrak",
  "yarak",
  "kahpe",
  "kaltak",
  "ibne",
  "pezevenk",
  "gavat",
  "surtuk",
  "gotveren",
  "gotlek",
  "godoş",
  "godos",
  // Azerbaijani
  "sikim",
  "sikdir",
  "sikeyin",
  "sikirem",
  "amciq",
  "amcig",
  "qehbe",
  "gehbe",
  "qahba",
  "gahba",
  "pezeveng",
  "yaraq",
  "yarrag",
  "gijdillaq",
  "gicdillaq",
  "doşşeyin",
  "dossoyin",
  // Russian
  "блядь",
  "бляд",
  "бляди",
  "блят",
  "бля",
  "сука",
  "суки",
  "суче",
  "сучка",
  "хуй",
  "хуя",
  "хуё",
  "хуе",
  "хуле",
  "нахуй",
  "похуй",
  "охуеть",
  "пизда",
  "пизде",
  "пизду",
  "пиздец",
  "пиздат",
  "ебать",
  "ебал",
  "ебан",
  "ебаный",
  "ёбаный",
  "заебал",
  "уебан",
  "мудак",
  "мудила",
  "гандон",
  "гондон",
  "шлюха",
  "шлюхи",
  "пидор",
  "пидорас",
  "педик",
  "долбоеб",
  "долбоёб",
  "залупа",
  "дрочить",
  "ублюдок",
  "чмо",
];

/**
 * Matched as a substring against the compacted form of the text — separators,
 * digits and repeats removed — so "f.u.c.k", "f u c k" and "fuuuck" are all
 * caught. Only long, unambiguous stems belong here; anything that can hide
 * inside an ordinary word must stay in {@link BOUNDED_TERMS}.
 */
export const COMPACT_TERMS: readonly string[] = [
  "fuck",
  "shit",
  "motherfuck",
  "bullshit",
  "asshole",
  "cocksucker",
  "nigger",
  "nigga",
  "faggot",
  "siktir",
  "orospu",
  "yarrak",
  "amcik",
  "amciq",
  "pezeven",
  "gotveren",
  "блядь",
  "пиздец",
  "нахуй",
  "долбоеб",
  "пидорас",
];

/**
 * Ordinary words that contain a {@link COMPACT_TERMS} stem once the text is
 * compacted. They are blanked out before the substring pass so a legitimate
 * word is never mistaken for an insult (the "Scunthorpe problem").
 */
export const ALLOWED_TERMS: readonly string[] = [
  "shiitake",
  "shitake",
  "assassin",
  "assassination",
  "assassins",
  "classic",
  "classical",
  "analysis",
  "analyst",
  "cockpit",
  "scunthorpe",
  "penistone",
  "matsushita",
];
