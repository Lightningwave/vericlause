const NRIC_PATTERN = /\b[STFG]\d{7}[A-Z]\b/gi;
const NAME_LIKE = /\b(?:Mr|Mrs|Ms|Dr|Mdm)\.\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/gi;
const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
const PHONE_PATTERN = /(?:\+65\s?)?\d{4}[\s-]?\d{4}\b/g;

export function redactPii(text: string): string {
  return text
    .replace(NRIC_PATTERN, "[REDACTED_NRIC]")
    .replace(NAME_LIKE, "[REDACTED_NAME]")
    .replace(EMAIL_PATTERN, "[REDACTED_EMAIL]")
    .replace(PHONE_PATTERN, "[REDACTED_PHONE]");
}
