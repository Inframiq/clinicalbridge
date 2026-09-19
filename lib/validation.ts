import { z } from "zod";

/**
 * Shared field-level constraints, reused by every form's zod schema (and, as
 * plain regexes, by the few plain-useState forms that validate manually
 * instead of through react-hook-form). Centralizing these keeps every input
 * across the app held to the same rules instead of each form inventing its
 * own - a form that only checks `.min(1)` looks validated but accepts
 * anything up to megabytes of text, a phone number with letters in it, or a
 * routing number that isn't 9 digits.
 */

export const NAME_REGEX = /^[\p{L}][\p{L}\p{M}' .-]*$/u;
export const PHONE_REGEX = /^[+]?[0-9()\-.\s]{7,20}$/;
export const NPI_REGEX = /^\d{10}$/;
export const ROUTING_NUMBER_REGEX = /^\d{9}$/;
export const BANK_ACCOUNT_NUMBER_REGEX = /^\d{4,17}$/;

/** A person's first/last/full name: letters (incl. accented), spaces, apostrophes, hyphens, periods. */
export function nameField(max = 60) {
  return z
    .string()
    .trim()
    .min(1, "Required")
    .max(max, `Must be ${max} characters or fewer`)
    .regex(NAME_REGEX, "Only letters, spaces, hyphens, and apostrophes are allowed");
}

/** Shared by signup and reset-password so both enforce the same minimum. */
export const passwordField = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be 72 characters or fewer");

export const emailField = z
  .string()
  .trim()
  .min(1, "Required")
  .max(254, "Email is too long")
  .email("Enter a valid email address");

export const phoneField = z
  .string()
  .trim()
  .min(7, "Enter a valid phone number")
  .max(20, "Phone number is too long")
  .regex(PHONE_REGEX, "Enter a valid phone number (digits, spaces, +, -, () only)");

/**
 * Same format rules as {@link phoneField}, but allows a blank value - for
 * profile/settings forms editing a field that may predate this validation
 * (an existing account with no phone on file yet shouldn't be blocked from
 * saving an unrelated field).
 */
export const optionalPhoneField = z
  .string()
  .trim()
  .max(20, "Phone number is too long")
  .refine((v) => v === "" || PHONE_REGEX.test(v), {
    message: "Enter a valid phone number (digits, spaces, +, -, () only)",
  });

/** Generic required single-line text (org names, titles, department names, etc). */
export function shortTextField(max: number, label = "Required") {
  return z.string().trim().min(1, label).max(max, `Must be ${max} characters or fewer`);
}

/** Generic optional single-line text. */
export function optionalTextField(max: number) {
  return z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer`)
    .optional()
    .or(z.literal(""));
}

/** Required free-text notes / descriptions / reasons - bounded so nothing unbounded reaches the database. */
export function notesField(min: number, max: number, requiredMessage?: string) {
  return z
    .string()
    .trim()
    .min(min, requiredMessage ?? `Must be at least ${min} characters`)
    .max(max, `Must be ${max} characters or fewer`);
}

/** NPI numbers are always exactly 10 digits. */
export const npiField = z
  .string()
  .trim()
  .regex(NPI_REGEX, "NPI number must be exactly 10 digits");

/** Medical/registration license numbers: alphanumeric, allows hyphens/spaces, no stray symbols. */
export function licenseNumberField(max = 40) {
  return z
    .string()
    .trim()
    .min(1, "Required")
    .max(max, `Must be ${max} characters or fewer`)
    .regex(/^[A-Za-z0-9][A-Za-z0-9\- ]*$/, "Letters, numbers, spaces, and hyphens only");
}

/** US bank routing numbers are always exactly 9 digits. */
export const routingNumberField = z
  .string()
  .trim()
  .regex(ROUTING_NUMBER_REGEX, "Routing number must be exactly 9 digits");

/** US bank account numbers run 4-17 digits. */
export const bankAccountNumberField = z
  .string()
  .trim()
  .regex(BANK_ACCOUNT_NUMBER_REGEX, "Account number must be 4-17 digits");

/** A bounded currency amount (hourly rate, compensation, etc), at most 2 decimal places. */
export function currencyField(min: number, max: number) {
  return z
    .number({ error: "Enter a valid amount" })
    .min(min, `Must be at least ${min}`)
    .max(max, `Must be ${max} or less`)
    .refine((v) => Number.isFinite(v) && Math.round(v * 100) === v * 100, {
      message: "At most 2 decimal places",
    });
}

/** A bounded whole-number count/quantity (doctors needed, hours per week, miles, etc). */
export function integerField(min: number, max: number) {
  return z
    .number({ error: "Enter a valid number" })
    .int("Must be a whole number")
    .min(min, `Must be at least ${min}`)
    .max(max, `Must be ${max} or less`);
}
