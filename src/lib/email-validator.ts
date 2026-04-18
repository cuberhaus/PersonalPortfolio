/**
 * Email validation + typo-suggestion.
 *
 * Thin wrapper around `@zootools/email-spell-checker` (a maintained fork of
 * the classic `mailcheck.js`) that returns a discriminated result the UI
 * layer can render directly:
 *
 *   { valid: true,  normalized }               — well-formed and no typo
 *   { valid: false, reason: 'empty' | 'format' } — structurally invalid
 *   { valid: false, reason: 'typo', suggestion } — looks like a common typo,
 *                                                  show "Did you mean …?"
 *
 * The library handles the typo-suggestion part (39+ popular domains, ~90
 * TLDs, Sift3 fuzzy matching, zero deps, ~1.8KB min+gzip). We add a stricter
 * structural regex on top because the library only proposes corrections and
 * doesn't reject malformed input on its own.
 *
 * Keeping this as a pure module (no DOM access) so it stays unit-testable
 * and reusable from any client-side script.
 */
import emailSpellChecker from '@zootools/email-spell-checker';

// Stricter than HTML5's `type="email"`:
// - Local: dot-separated chunks of [A-Za-z0-9_%+-] (no leading/trailing dots,
//   no consecutive dots)
// - Domain labels: alphanumeric, optional hyphens in the middle
// - TLD: 2+ alphabetic characters
const EMAIL_REGEX =
  /^[A-Za-z0-9_%+\-]+(?:\.[A-Za-z0-9_%+\-]+)*@[A-Za-z0-9](?:[A-Za-z0-9\-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9\-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;

export type EmailValidationResult =
  | { valid: true; normalized: string }
  | { valid: false; reason: 'empty' }
  | { valid: false; reason: 'format' }
  | { valid: false; reason: 'typo'; suggestion: string };

export function validateEmail(raw: string): EmailValidationResult {
  const email = raw.trim().toLowerCase();
  if (!email) return { valid: false, reason: 'empty' };

  // Structural check first: the spell-checker will happily "correct"
  // malformed input (e.g. "foo@example..org" → "foo@example.org"), so we
  // must reject clearly broken addresses before asking it for suggestions.
  if (!EMAIL_REGEX.test(email)) {
    return { valid: false, reason: 'format' };
  }

  // The address parses — now check if it looks like a common typo. This
  // catches cases that are structurally valid but semantically wrong, e.g.
  // "polcg10@ail.com" is a valid-looking address but almost certainly a
  // misspelling of "@gmail.com".
  const suggestion = emailSpellChecker.run({ email });
  if (suggestion && suggestion.full && suggestion.full !== email) {
    return { valid: false, reason: 'typo', suggestion: suggestion.full };
  }

  return { valid: true, normalized: email };
}
