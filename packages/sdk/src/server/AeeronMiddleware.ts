import type { Request, Response, NextFunction } from "express";
import { X402Codec } from "../protocol/X402Codec";
import { PaymentVerifier } from "./PaymentVerifier";
import type { AeeronMiddlewareConfig } from "./types";
import {
  X402_HEADER_PAYMENT_DETAILS,
  X402_HEADER_PAYMENT_PROOF,
  X402_HEADER_VERSION,
  X402_HEADER_NETWORK,
  X402_PROTOCOL_VERSION,
} from "../constants";

/**
 * Express middleware that gates a route behind an x402 payment wall.
 *
 * Usage:
 * ```ts
 * app.use("/premium", AeeronMiddleware({ payee: "YourWallet", amount: 1_000_000 }));
 * ```
 */
export function AeeronMiddleware(config: AeeronMiddlewareConfig) {
  const verifier = new PaymentVerifier(config);

  return async (req: Request, res: Response, next: NextFunction) => {
    const proofHeader = req.headers[X402_HEADER_PAYMENT_PROOF];

    // No proof present → issue 402 with payment details
    if (!proofHeader || typeof proofHeader !== "string") {
      const details = X402Codec.buildPaymentDetails({
        payee: config.payee,
        amount: config.amount,
        token: config.token,
        ttlSeconds: config.ttlSeconds,
        network: config.network,
      });

      res
        .status(402)
        .set(X402_HEADER_PAYMENT_DETAILS, X402Codec.encodePaymentDetails(details))
        .set(X402_HEADER_VERSION, String(X402_PROTOCOL_VERSION))
        .set(X402_HEADER_NETWORK, config.network ?? "mainnet-beta")
        .json({
          error: "Payment Required",
          message: "This resource requires an x402 payment. Include X-Payment-Proof to proceed.",
          protocol: "aeeron/x402",
          version: X402_PROTOCOL_VERSION,
        });
      return;
    }

    // Proof present → verify and allow or reject
    const result = await verifier.verify(proofHeader);

    if (!result.valid) {
      res.status(402).json({
        error: "Invalid Payment",
        reason: result.error,
        protocol: "aeeron/x402",
      });
      return;
    }

    // Attach payment context to the request for downstream handlers
    (req as any).aeeronPayment = {
      payer: result.payerAddress,
      amount: result.amount,
      txHash: result.txHash,
    };

    next();
  };
}
