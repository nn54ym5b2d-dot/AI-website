import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { ApiError } from "@/lib/api/http";
import { getAuthConfig } from "@/lib/auth/config";

export const LOCAL_TEST_MERCHANT_ID = "yuansu-local-test";
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

export type LocalTestEvent = {
  eventId: string;
  eventType: "payment.succeeded" | "refund.succeeded";
  provider: "wechat_pay" | "alipay";
  merchantId: string;
  resourceNo: string;
  amountCents: number;
  currency: "CNY";
  timestamp: string;
  nonce: string;
  providerTradeNo: string;
};

function testSecret() {
  return process.env.PAYMENT_TEST_SECRET || `local-test:${getAuthConfig().authSecret}`;
}

export function assertLocalTestProviderEnabled() {
  if (process.env.NODE_ENV === "production" && process.env.PAYMENT_LOCAL_TEST_ENABLED !== "true") {
    throw new ApiError(503, "UPSTREAM_UNAVAILABLE", "生产环境未启用本地测试支付适配器。");
  }
}

export function signLocalTestPayload(rawBody: string) {
  return createHmac("sha256", testSecret()).update(rawBody).digest("hex");
}

export function createLocalTestEvent(input: {
  eventType: LocalTestEvent["eventType"];
  provider: LocalTestEvent["provider"];
  resourceNo: string;
  amountCents: number;
}) {
  assertLocalTestProviderEnabled();
  const id = randomUUID().replaceAll("-", "");
  const event: LocalTestEvent = {
    eventId: `evt_test_${id}`,
    eventType: input.eventType,
    provider: input.provider,
    merchantId: LOCAL_TEST_MERCHANT_ID,
    resourceNo: input.resourceNo,
    amountCents: input.amountCents,
    currency: "CNY",
    timestamp: new Date().toISOString(),
    nonce: randomUUID().replaceAll("-", ""),
    providerTradeNo: `${input.eventType === "payment.succeeded" ? "trade" : "refund"}_test_${id}`
  };
  const rawBody = JSON.stringify(event);
  return { event, rawBody, signature: signLocalTestPayload(rawBody) };
}

export function verifyLocalTestEvent(rawBody: string, signature: string | null): LocalTestEvent {
  assertLocalTestProviderEnabled();
  if (!signature || !/^[a-f0-9]{64}$/.test(signature)) {
    throw new ApiError(401, "PAYMENT_SIGNATURE_INVALID", "测试支付回调签名无效。");
  }
  const expected = signLocalTestPayload(rawBody);
  if (!timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"))) {
    throw new ApiError(401, "PAYMENT_SIGNATURE_INVALID", "测试支付回调签名无效。");
  }
  let value: unknown;
  try {
    value = JSON.parse(rawBody);
  } catch {
    throw new ApiError(400, "INVALID_REQUEST", "支付回调正文不是有效 JSON。");
  }
  const event = value as Partial<LocalTestEvent>;
  if (
    !event.eventId ||
    !event.resourceNo ||
    !event.nonce ||
    !event.providerTradeNo ||
    !event.timestamp ||
    (event.eventType !== "payment.succeeded" && event.eventType !== "refund.succeeded") ||
    (event.provider !== "wechat_pay" && event.provider !== "alipay") ||
    event.merchantId !== LOCAL_TEST_MERCHANT_ID ||
    event.currency !== "CNY" ||
    typeof event.amountCents !== "number" ||
    !Number.isInteger(event.amountCents) ||
    event.amountCents <= 0
  ) {
    throw new ApiError(422, "VALIDATION_ERROR", "测试支付回调字段不完整或商户信息不匹配。");
  }
  const timestamp = new Date(event.timestamp).getTime();
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > MAX_CLOCK_SKEW_MS) {
    throw new ApiError(401, "PAYMENT_SIGNATURE_INVALID", "测试支付回调时间戳已失效。");
  }
  return event as LocalTestEvent;
}
