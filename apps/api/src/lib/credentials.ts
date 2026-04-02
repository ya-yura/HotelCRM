import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const HASH_PREFIX = "s1";

function encode(buffer: Buffer) {
  return buffer.toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url");
}

export function hashSecret(secret: string) {
  const salt = randomBytes(16);
  const hash = scryptSync(secret, salt, 64);
  return `${HASH_PREFIX}$${encode(salt)}$${encode(hash)}`;
}

export function verifySecret(secret: string, secretHash?: string, legacySecret?: string) {
  if (secretHash) {
    const [prefix, saltRaw, hashRaw] = secretHash.split("$");
    if (prefix !== HASH_PREFIX || !saltRaw || !hashRaw) {
      return false;
    }

    const actual = scryptSync(secret, decode(saltRaw), 64);
    const expected = decode(hashRaw);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }

  if (typeof legacySecret !== "string") {
    return false;
  }

  const actual = Buffer.from(secret);
  const expected = Buffer.from(legacySecret);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createPinHint(pin: string) {
  return `PIN ends with ${pin.slice(-2)}`;
}
