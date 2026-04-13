# Contributing to Aeeron

Thank you for your interest in contributing to Aeeron Protocol. We welcome contributions of all kinds — bug fixes, new features, documentation, and protocol improvements.

## Code of Conduct

Be respectful. We follow the [Rust Code of Conduct](https://www.rust-lang.org/policies/code-of-conduct) as our baseline.

## Development Setup

### Prerequisites

- Node.js >= 20
- pnpm >= 9
- Rust >= 1.75 (for Solana program development)
- Solana CLI >= 1.18
- Anchor CLI >= 0.30

### Getting Started

```bash
git clone https://github.com/aeeron-protocol/aeeron
cd aeeron
pnpm install
cp .env.example .env
```

### Running the local validator

```bash
solana-test-validator &
anchor deploy --provider.cluster localnet
pnpm dev
```

## Project Structure

| Directory | Description |
|---|---|
| `programs/aeeron-protocol/` | Solana on-chain program (Rust + Anchor) |
| `packages/sdk/` | `@aeeron/sdk` — TypeScript client |
| `packages/protocol/` | `@aeeron/protocol` — Types & codec |
| `apps/api/` | Gateway API server |
| `apps/dashboard/` | Protocol dashboard |

## Submitting Changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes with clear, atomic commits
4. Run tests: `pnpm test`
5. Run typecheck: `pnpm typecheck`
6. Open a pull request against `main`

## Commit Convention

We use [Conventional Commits](https://conventionalcommits.org):

```
feat: add USDC streaming payment support
fix: prevent nonce reuse in direct_pay instruction
docs: update x402 header specification
chore: bump anchor to 0.30.1
```

## Security

For security vulnerabilities, **do not open a public issue**. Contact security@aeeron.xyz.

## License

By contributing, you agree that your contributions will be licensed under the Apache 2.0 License.
