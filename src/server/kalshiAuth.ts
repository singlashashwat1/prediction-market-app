import crypto from "crypto";

export function createKalshiAuthHeaders(): Record<string, string> {
  const apiKeyId = process.env.KALSHI_API_KEY_ID;
  const privateKeyPem = process.env.KALSHI_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!apiKeyId || !privateKeyPem) {
    throw new Error(
      "Missing KALSHI_API_KEY_ID or KALSHI_PRIVATE_KEY in environment variables"
    );
  }

  const timestamp = Date.now().toString();
  const method = "GET";
  const path = "/trade-api/ws/v2";
  const message = timestamp + method + path;

  const privateKey = crypto.createPrivateKey({
    key: privateKeyPem,
    format: "pem",
  });

  const signature = crypto
    .sign("sha256", Buffer.from(message, "utf-8"), {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
    })
    .toString("base64");

  return {
    "KALSHI-ACCESS-KEY": apiKeyId,
    "KALSHI-ACCESS-SIGNATURE": signature,
    "KALSHI-ACCESS-TIMESTAMP": timestamp,
  };
}
