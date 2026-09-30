import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeCanadianPhoneNumber(phoneNumber?: string | null) {
  if (!phoneNumber) return null;

  const digits = getCanadianPhoneInputDigits(phoneNumber);
  return digits.length === 10 ? digits : null;
}

export function getCanadianPhoneInputDigits(phoneNumber?: string | null) {
  if (!phoneNumber) return "";

  const withoutCountryPrefix = phoneNumber.trim().startsWith("+1")
    ? phoneNumber.trim().slice(2)
    : phoneNumber;
  let digits = withoutCountryPrefix.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }

  return digits;
}

export function formatCanadianPhoneInputValue(phoneNumber?: string | null) {
  const digits = getCanadianPhoneInputDigits(phoneNumber);

  if (digits.length !== 10) {
    return digits;
  }

  return formatCanadianPhoneNumber(digits);
}

export function formatCanadianPhoneNumber(phoneNumber?: string | null) {
  if (!phoneNumber) return "";

  const digits = normalizeCanadianPhoneNumber(phoneNumber);
  if (!digits) {
    return phoneNumber;
  }

  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

// Canonicalize letter-prefixed menu codes: L01 -> L1, A002B -> A2B.
// Numeric-only codes such as 08 remain unchanged.
export function normalizeProductDisplayName(value: string) {
  return value.replace(
    /^([A-Za-z]+)0*(\d+)([A-Za-z]*)(?=[.)\s]|$)/,
    (_match, prefix: string, digits: string, suffix: string) =>
      `${prefix}${Number.parseInt(digits, 10)}${suffix}`
  );
}

function getCanonicalProductCode(value: string) {
  return (
    normalizeProductDisplayName(value.trim())
      .match(/^([A-Za-z]+\d+[A-Za-z]*)(?=[.)\s]|$)/)?.[1]
      ?.toLowerCase() ?? null
  );
}

function getCanonicalNumericProductCode(value: string) {
  const match = value
    .trim()
    .match(/^(\d+)([A-Za-z]*)(?=[.)\s]|$)/);
  if (!match) return null;

  return `${match[1].replace(/^0+(?=\d)/, "")}${match[2].toLowerCase()}`;
}

export function matchesProductSearch(productName: string, searchValue: string) {
  const query = normalizeProductDisplayName(searchValue.trim()).toLowerCase();
  if (!query) return true;

  const codeOnlyQuery = query.match(/^([a-z]+\d+[a-z]*)[.)]?$/)?.[1];
  if (codeOnlyQuery) {
    return getCanonicalProductCode(productName) === codeOnlyQuery;
  }

  const numericCodeQuery = query.match(/^(\d+)([a-z]*)[.)]?$/);
  if (numericCodeQuery) {
    const [, digits, suffix] = numericCodeQuery;
    const canonicalDigits = digits.replace(/^0+(?=\d)/, "");
    const canonicalQuery = `${canonicalDigits}${suffix}`;
    const productCode = getCanonicalNumericProductCode(productName);
    if (!productCode) return false;

    return digits !== canonicalDigits || suffix.length > 0
      ? productCode === canonicalQuery
      : productCode.startsWith(canonicalQuery);
  }

  return normalizeProductDisplayName(productName)
    .toLowerCase()
    .includes(query);
}

export function dedupeProductsByCanonicalCode<
  T extends { id: number; name: string },
>(products: T[]) {
  const uniqueProducts = new Map<string, T>();

  products.forEach((product) => {
    const displayName = normalizeProductDisplayName(product.name);
    const code = getCanonicalProductCode(displayName);
    const key = code ? `code:${code}` : `id:${product.id}`;
    const current = uniqueProducts.get(key);

    if (
      !current ||
      (product.name === displayName &&
        current.name !== normalizeProductDisplayName(current.name))
    ) {
      uniqueProducts.set(key, product);
    }
  });

  return Array.from(uniqueProducts.values());
}

// Robust natural sort for product names like "08)", "104)", "66B)", "L1)", etc.
export function naturalSort(a: string, b: string) {
  const regex = /^([A-Za-z]*)(\d+)([A-Za-z]*)\)\s*(.*)$/;
  const mA = a.match(regex);
  const mB = b.match(regex);
  if (!mA || !mB) {
    return a.localeCompare(b);
  }

  const prefixA = mA[1] || "";
  const prefixB = mB[1] || "";
  if (prefixA !== prefixB) {
    return prefixA.localeCompare(prefixB);
  }

  const numA = parseInt(mA[2], 10);
  const numB = parseInt(mB[2], 10);
  if (numA !== numB) {
    return numA - numB;
  }

  // If the numbers are equal, compare suffix letters (if any):
  const letterA = mA[3] || "";
  const letterB = mB[3] || "";
  if (letterA !== letterB) {
    return letterA.localeCompare(letterB);
  }

  // Finally, if number+letter are identical, compare whatever follows after ") "
  const restA = mA[4] || "";
  const restB = mB[4] || "";
  return restA.localeCompare(restB);
}
