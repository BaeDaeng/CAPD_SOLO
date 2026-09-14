export const BIRTH_YEAR_MIN = 1900;
export const BIRTH_YEAR_MAX = 2026;

const trimValue = (value) => String(value ?? '').trim();

const isNumericText = (value, minLength, maxLength) => {
  const text = trimValue(value);
  return new RegExp(`^\\d{${minLength},${maxLength}}$`).test(text);
};

export const isValidBirthDateParts = ({ year, month, day }) => {
  const yearText = trimValue(year);
  const monthText = trimValue(month);
  const dayText = trimValue(day);

  if (!isNumericText(yearText, 4, 4)) return false;
  if (!isNumericText(monthText, 1, 2)) return false;
  if (!isNumericText(dayText, 1, 2)) return false;

  const yearNumber = Number(yearText);
  const monthNumber = Number(monthText);
  const dayNumber = Number(dayText);

  return (
    yearNumber >= BIRTH_YEAR_MIN &&
    yearNumber <= BIRTH_YEAR_MAX &&
    monthNumber >= 1 &&
    monthNumber <= 12 &&
    dayNumber >= 1 &&
    dayNumber <= 31
  );
};

export const normalizeBirthDate = (birthDateParts) => {
  if (!isValidBirthDateParts(birthDateParts)) return null;

  const year = trimValue(birthDateParts.year);
  const month = String(Number(trimValue(birthDateParts.month))).padStart(2, '0');
  const day = String(Number(trimValue(birthDateParts.day))).padStart(2, '0');

  return `${year}-${month}-${day}`;
};
