import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual
} from "node:crypto";

const inviteCodeCipherVersion = "v1";
const inviteCodeCipherAad = Buffer.from("yuansu:invite-code:v1");

function inviteCodeCipherKey(secret: string) {
  return createHash("sha256").update(`invite-code:${secret}`).digest();
}

export function createOpaqueToken(byteLength = 32) {
  return randomBytes(byteLength).toString("base64url");
}

export function createVerificationCode() {
  const value = randomBytes(4).readUInt32BE(0) % 1_000_000;
  return value.toString().padStart(6, "0");
}

export function hashWithSecret(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function hashInviteCode(value: string) {
  return createHash("sha256").update(value.trim().toUpperCase()).digest("hex");
}

export function encryptInviteCode(value: string, secret: string) {
  const initializationVector = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", inviteCodeCipherKey(secret), initializationVector);
  cipher.setAAD(inviteCodeCipherAad);
  const encrypted = Buffer.concat([cipher.update(value.trim().toUpperCase(), "utf8"), cipher.final()]);
  const authenticationTag = cipher.getAuthTag();
  return [
    inviteCodeCipherVersion,
    initializationVector.toString("base64url"),
    authenticationTag.toString("base64url"),
    encrypted.toString("base64url")
  ].join(".");
}

export function decryptInviteCode(value: string, secret: string) {
  const [version, initializationVector, authenticationTag, encrypted] = value.split(".");
  if (version !== inviteCodeCipherVersion || !initializationVector || !authenticationTag || !encrypted) {
    throw new Error("Unsupported invite-code ciphertext.");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    inviteCodeCipherKey(secret),
    Buffer.from(initializationVector, "base64url")
  );
  decipher.setAAD(inviteCodeCipherAad);
  decipher.setAuthTag(Buffer.from(authenticationTag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64url")),
    decipher.final()
  ]).toString("utf8");
}

export function hashContent(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
