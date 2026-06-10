export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function toMalaysiaLocalNumber(value: string) {
  let digits = digitsOnly(value);
  if (digits.startsWith("60")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}

export function toMalaysiaPhoneNumber(value: string) {
  const local = toMalaysiaLocalNumber(value);
  return local ? `+60${local}` : "";
}

export function isValidMalaysiaPhoneNumber(value: string) {
  const local = toMalaysiaLocalNumber(value);
  return local.length >= 8 && local.length <= 10;
}
