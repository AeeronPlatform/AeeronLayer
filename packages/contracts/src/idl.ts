export type AeeronProtocol = {
  version: "0.1.0";
  name: "aeeron_protocol";
  instructions: [
    {
      name: "openChannel";
      accounts: [
        { name: "payer"; isMut: true; isSigner: true },
        { name: "payee"; isMut: false; isSigner: false },
        { name: "channel"; isMut: true; isSigner: false },
        { name: "vault"; isMut: true; isSigner: false },
        { name: "systemProgram"; isMut: false; isSigner: false }
      ];
      args: [
        {
          name: "params";
          type: {
            defined: "OpenChannelParams";
          };
        }
      ];
    },
    {
      name: "fundChannel";
      accounts: [
        { name: "payer"; isMut: true; isSigner: true },
        { name: "channel"; isMut: true; isSigner: false },
        { name: "vault"; isMut: true; isSigner: false },
        { name: "systemProgram"; isMut: false; isSigner: false }
      ];
      args: [{ name: "amount"; type: "u64" }];
    },
    {
      name: "settlePayment";
      accounts: [
        { name: "payee"; isMut: true; isSigner: true },
        { name: "payer"; isMut: false; isSigner: false },
        { name: "channel"; isMut: true; isSigner: false },
        { name: "vault"; isMut: true; isSigner: false },
        { name: "nonceRecord"; isMut: true; isSigner: false },
        { name: "systemProgram"; isMut: false; isSigner: false },
        { name: "clock"; isMut: false; isSigner: false }
      ];
      args: [
        {
          name: "params";
          type: {
            defined: "SettlePaymentParams";
          };
        }
      ];
    },
    {
      name: "closeChannel";
      accounts: [
        { name: "payer"; isMut: true; isSigner: true },
        { name: "channel"; isMut: true; isSigner: false },
        { name: "vault"; isMut: true; isSigner: false },
        { name: "systemProgram"; isMut: false; isSigner: false },
        { name: "clock"; isMut: false; isSigner: false }
      ];
      args: [];
    },
    {
      name: "directPay";
      accounts: [
        { name: "payer"; isMut: true; isSigner: true },
        { name: "payee"; isMut: true; isSigner: false },
        { name: "nonceRecord"; isMut: true; isSigner: false },
        { name: "systemProgram"; isMut: false; isSigner: false },
        { name: "clock"; isMut: false; isSigner: false }
      ];
      args: [
        {
          name: "params";
          type: {
            defined: "DirectPayParams";
          };
        }
      ];
    }
  ];
  accounts: [
    {
      name: "PaymentChannel";
      type: {
        kind: "struct";
        fields: [
          { name: "payer"; type: "publicKey" },
          { name: "payee"; type: "publicKey" },
          { name: "tokenMint"; type: { option: "publicKey" } },
          { name: "balance"; type: "u64" },
          { name: "settled"; type: "u64" },
          { name: "sequence"; type: "u64" },
          { name: "expiry"; type: "i64" },
          { name: "isOpen"; type: "bool" },
          { name: "bump"; type: "u8" }
        ];
      };
    },
    {
      name: "NonceRecord";
      type: {
        kind: "struct";
        fields: [
          { name: "nonce"; type: { array: ["u8", 32] } },
          { name: "payer"; type: "publicKey" },
          { name: "expiry"; type: "i64" },
          { name: "bump"; type: "u8" }
        ];
      };
    }
  ];
  events: [
    {
      name: "PaymentSettledEvent";
      fields: [
        { name: "payer"; type: "publicKey"; index: false },
        { name: "payee"; type: "publicKey"; index: false },
        { name: "amount"; type: "u64"; index: false },
        { name: "tokenMint"; type: { option: "publicKey" }; index: false },
        { name: "nonce"; type: { array: ["u8", 32] }; index: false },
        { name: "channel"; type: { option: "publicKey" }; index: false },
        { name: "settledAt"; type: "i64"; index: false }
      ];
    },
    {
      name: "ChannelOpenedEvent";
      fields: [
        { name: "channel"; type: "publicKey"; index: false },
        { name: "payer"; type: "publicKey"; index: false },
        { name: "payee"; type: "publicKey"; index: false },
        { name: "initialBalance"; type: "u64"; index: false },
        { name: "expiry"; type: "i64"; index: false }
      ];
    },
    {
      name: "ChannelClosedEvent";
      fields: [
        { name: "channel"; type: "publicKey"; index: false },
        { name: "payer"; type: "publicKey"; index: false },
        { name: "payee"; type: "publicKey"; index: false },
        { name: "totalSettled"; type: "u64"; index: false },
        { name: "refunded"; type: "u64"; index: false }
      ];
    }
  ];
  errors: [
    { code: 6000; name: "ChannelInactive"; msg: "Channel is closed or expired" },
    { code: 6001; name: "InsufficientBalance"; msg: "Insufficient channel balance" },
    { code: 6002; name: "NonceAlreadyUsed"; msg: "Nonce already used" },
    { code: 6003; name: "NonceExpired"; msg: "Nonce expired" },
    { code: 6004; name: "InvalidSignature"; msg: "Invalid payment proof signature" },
    { code: 6005; name: "ZeroAmount"; msg: "Amount is zero" },
    { code: 6006; name: "ProofExpired"; msg: "Payment proof expired" }
  ];
};

export const IDL: AeeronProtocol = {
  version: "0.1.0",
  name: "aeeron_protocol",
  instructions: [] as any,
  accounts: [] as any,
  events: [] as any,
  errors: [] as any,
};
