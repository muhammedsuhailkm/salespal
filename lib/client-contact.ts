/**
 * A client can be saved with just a name while it is a Lead (or closed out as
 * lost / black-listed). Every other status means we are talking to them,
 * so contact person, phone and designation are required.
 */
const NO_CONTACT_NEEDED = new Set(["lead", "lost", "blacklisted"]);

export function statusRequiresContact(status: string | null | undefined) {
  return !!status && !NO_CONTACT_NEEDED.has(status);
}

export type ContactFields = {
  contact_person_name?: string | null;
  contact_no?: string | null;
  contact_person_designation?: string | null;
};

export const CONTACT_FIELD_LABELS: Record<keyof ContactFields, string> = {
  contact_person_name: "Contact person",
  contact_no: "Phone number",
  contact_person_designation: "Designation",
};

/** Keys of the required contact fields that are blank. */
export function missingContactFields(client: ContactFields): (keyof ContactFields)[] {
  return (Object.keys(CONTACT_FIELD_LABELS) as (keyof ContactFields)[]).filter((key) => !client[key]?.trim());
}

/** Trims a text field from a request body; `undefined` stays undefined (= not sent). */
export function cleanText(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  return typeof value === "string" ? value.trim() : "";
}

export function contactRequiredMessage(missing: (keyof ContactFields)[]) {
  return `${missing.map((key) => CONTACT_FIELD_LABELS[key]).join(", ")} required once a client is past Lead`;
}
