const KEYS_OF = {
  model: ["model"],
  title: ["title"],
  capacity: ["capacity"],
  requiredPilots: ["requiredPilots"],
  location: ["locationName", "locationAddress"],
  destination: ["destinationName", "destinationAddress"],
} as const;

export type ValueField = keyof typeof KEYS_OF;

const isValueField = (field: string): field is ValueField =>
  Object.hasOwn(KEYS_OF, field);

export function fieldsWithValues(
  fields: readonly string[],
  from: Record<string, unknown>,
  to: Record<string, unknown>,
): ValueField[] {
  return fields
    .filter(isValueField)
    .filter((field) =>
      KEYS_OF[field].some(
        (key) => Object.hasOwn(from, key) || Object.hasOwn(to, key),
      ),
    );
}

export function bookingSwitch(
  fields: readonly string[],
  to: Record<string, unknown>,
): "bookingOpened" | "bookingClosed" | null {
  if (fields.length !== 1 || fields[0] !== "announced") return null;
  if (typeof to.announced !== "boolean") return null;
  return to.announced ? "bookingOpened" : "bookingClosed";
}
