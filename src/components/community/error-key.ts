import type { CommunityError } from "@/lib/discussions/actions";

/**
 * Maps a community write's refusal code onto its message key in the `community`
 * namespace. The server deliberately returns codes rather than sentences, so
 * the copy stays localizable (EN/TR/RU) and this table is the single place the
 * two vocabularies meet.
 */
export const COMMUNITY_ERROR_KEY: Record<CommunityError, string> = {
  unauthorized: "errorUnauthorized",
  invalidTarget: "errorInvalidTarget",
  titleEmpty: "errorTitleEmpty",
  titleTooShort: "errorTitleTooShort",
  titleTooLong: "errorTitleTooLong",
  titleProfanity: "errorTitleProfanity",
  bodyEmpty: "errorBodyEmpty",
  bodyTooShort: "errorBodyTooShort",
  bodyTooLong: "errorBodyTooLong",
  bodyProfanity: "errorBodyProfanity",
  locked: "errorLocked",
  rateLimited: "errorRateLimited",
  failed: "errorFailed",
};
