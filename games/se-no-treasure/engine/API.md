# Engine API

ES modules, no dependencies or build step. Import `./engine/game.mjs` in browser or Node. All returned objects are recursively frozen. Inputs are never mutated. Invalid input throws TypeError.

- `createMatch(seed)` accepts nonempty string up to 128 UTF-16 characters or uint32, and returns state.
- `getRoundInfo(state)` returns `{round,prizes,scores,charges,over,outcome}`. Prizes is length3 while active, `[]` when over.
- `validateChoice(state,player,choice)` returns true or throws. Player is exactly 0 or 1. Choice has exactly `{lane:0|1|2,style:'normal'|'greedy'}`.
- `resolveRound(state,[choice0,choice1])` returns `{state,events}`.
- `chooseCpuChoice(state,player,seed='practice')` returns legal choice. It has no current-human-choice input; RNG is derived from public state and optional separate seed.
- `assertMatch(state)` reconstructs up to eight historical rounds and validates entire snapshot.
- `assertChoiceShape(choice)` validates shape independent of match.
- Constants `ROUNDS=8`, `INITIAL_CHARGES=2`.

State: `{version:1,seed:string,round:1..9,scores:[p0,p1],charges:[p0,p1],history:[],over:boolean,outcome:null|'player0'|'player1'|'draw'}`. Round is 9 only after final resolution. History entries and `events` have `{round,prizes,choices,clash,delta,scores,charges}`. Delta reports actual signed score change after applying the zero floor.

`./engine/commit.mjs` requires native WebCrypto (HTTPS/localhost):
- `secureNonce()` returns 32 cryptographically random bytes as 64 lowercase hexadecimal chars.
- `await hashChoice(matchId,turn,choice,nonce,playerIndex)` returns SHA256 as lowercase hex.
- `await verifyChoice(commitment,matchId,turn,choice,nonce,playerIndex)` returns boolean or throws for malformed input.
- Canonical preimage: JSON.stringify(['otakara-commit-v2',matchId,turn,playerIndex,choice.lane,choice.style,nonce]). `playerIndex` exactly 0 or 1 (required), `turn` 1..8, matchId nonempty <=128 chars.

Transport must bind peer identity/player index, match ID and active turn; reject duplicates/stale/future messages; collect both commits before reveals; verify both before resolve; agree initial seed. Do not declare a disconnect an automatic victory. Hash utility prevents cross-seat/match/turn reuse and mirrored opponent commitments but cannot implement the protocol itself. Pure immutable engine intentionally permits deterministic recomputation from old snapshots, so transport owns replay rejection.

Run tests: `node --test engine/game.test.mjs`. Includes all36 action pairings, 1000 full seeded property cases, malformed data, score floor, charge exhaustion, no mutation, side symmetry, CPU independence, and cryptographic tamper/replay domain checks.

`playerIndex` is required: host = 0, guest = 1. Seat binding prevents copied-commitment reflection attacks. Hash with your own seat; verify with the remote seat.
