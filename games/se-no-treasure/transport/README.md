# Two-phone room transport

`room-transport.mjs` is a dependency-injected browser ES module, independent of the game engine. Pass a pinned, locally bundled PeerJS `Peer` constructor. No credentials, accounts, paid APIs, external assets, TURN, publishing, or analytics are created by this module. Networking starts only after `host()` / `join()`.

## Contract

```js
import { RoomTransport } from './transport/room-transport.mjs';
const room = new RoomTransport({
  Peer,
  validatePayload(type, payload, turn) { return gameSchemaAllows(type, payload, turn); },
  onStatus(event) { /* connecting, waiting, connected, signaling-disconnected, disconnected */ },
  onMessage({ type, payload, turn, role }) { /* role is remote sender */ }
});
const code = await room.host(); // or await room.join(code)
// Promise means signaling is available. ONLY connected status permits play.
room.setTurn(1);
room.send('action', { kind: 'commit', hash: '...' });
room.close();
```

`action` is symmetric, exact-current-turn, and validated. `state` is host-only; incoming snapshot turn may equal or exceed current turn. Receiving state does NOT automatically set the turn: app validates and calls `setTurn`. All outgoing packets must use current turn. `validatePayload` defaults to rejecting everything. It must implement exact schemas, numeric ranges, enum choices, finite numbers and field size checks. Never render remote content with innerHTML.

Host and guest are seat identities only, not trusted identities. Code is 8 unambiguous characters (40 random bits), normalized from `ABCD-2345`. Only one guest connection is accepted. This is a casual private-room invitation, not user authentication or anti-cheat infrastructure. A person with the code may join first; do not publicly post private codes.

Both peers may send commit/reveal actions. The APP must enforce one commit per seat/round, one reveal per seat/round, reveal only after both commitments, hash verification, deterministic engine legality, rematch agreement and host-only start. The transport only enforces envelope integrity, monotonic sequence numbers, session nonce, message size and turn. Sequence replay protection alone does not prohibit a new sequence containing a repeated semantic action.

Turns are monotonic throughout a connection. For rematches use a global turn counter or create a new room/session; do not reset to zero on an existing transport. SHA-256 commitments should bind protocol, matchId, round, seat, lane, style and a fresh cryptographically random 128-bit nonce using a canonical serialization. Do not reveal the nonce or choice before both commitments arrive.

On any data-channel close, heartbeat timeout, invalid packet or PeerJS error, the room is destroyed and `disconnected` emits. Stop input, show an unfinished/no-winner outcome and ask to start a NEW room. Never automatically restart the round, award a win or reuse commitments. Signaling-only disconnect leaves established data alive, emits `signaling-disconnected` with `connected:true`, and tries signaling reconnect; game state is never recreated. iOS background/sleep may suspend the page and cause timeout; keep both screens open.

## Online limitations and privacy

- Free shared PeerJS Cloud provides signaling without an account. Current official documentation gives no numeric cloud quota, uptime guarantee or service-level promise, and recommends self-hosting for high traffic. Code collisions can occur; the user can create another room.
- Explicit Google STUN only. There is NO TURN relay. Some cellular networks, symmetric NAT, restrictive Wi-Fi/firewalls or blocked signaling ports prevent connection. Same Wi-Fi can help but is not a guarantee. Show a connection failure after 20 seconds and offer retry or same-phone pass-and-play. Manual SDP copy/paste is intentionally absent: it does not solve NAT and is poor smartphone UX.
- Serve via HTTPS (GitHub Pages supports it). WebRTC data channels are supported in Safari/iOS, but actual iOS+Android separate-device QA is still required. No microphone/camera permission is requested.
- The application stores no personal data. The signaling/STUN services and remote peer necessarily receive network/session metadata (including network addresses during WebRTC connectivity); do not claim anonymous communication or zero third-party data. Only room identifiers, WebRTC signaling and bounded game actions are intended to be sent.

## Verification

Run: `node --test transport/room-transport.test.mjs`

Automated tests use fake peers; passing them does not prove real NAT traversal. Required device matrix before claiming phone-to-phone verified:

1. iPhone Safari + Android Chrome on same Wi-Fi: host/join, all 8 rounds, results, agreed rematch.
2. Separate Wi-Fi, then Wi-Fi vs cellular, then separate cellular. Record actual success/failure; failure is expected for some no-TURN combinations.
3. Guest joins wrong/malformed room; occupied room rejects third phone; host quits while waiting.
4. Kill network/close browser/background a phone for >20s mid-commit and mid-reveal: other screen ends unfinished with no winner and cannot submit moves.
5. Delayed/duplicate commit, early reveal, wrong reveal nonce, wrong match/round/seat, oversized payload, invalid protocol/session, replayed sequence: reject without mutating scores.
6. Block signaling while connected: established channel may continue; no double start or score reset. Block before join: clear error/retry/local-mode path.
7. Portrait 320/375/390/430px safe areas, address bar expanded, tap targets >=44px, no keyboard covering room join.
8. No persistence after reload; no claim of reconnect/resume. New room generates fresh session and fresh match commitments.

## Official references checked 2026-10-11

- https://peerjs.com/server/cloud
- https://peerjs.com/client/faq
- https://peerjs.com/server/getting-started
- https://peerjs.com/client/api/peer
- https://peerjs.com/client/getting-started
- https://webkit.org/blog/7763/a-closer-look-into-webrtc/

Old PeerJS documentation mentions a free TURN server. Do not rely on that historical claim: current documentation says PeerServer handles signaling and a TURN server must be configured separately.

## Opt-in connection diagnostics

Open with `?transportDebug=1` to log connection phases and browser ICE/data-channel states to the console. Diagnostic output intentionally excludes room codes, peer IDs, SDP, ICE candidates, addresses, and game payloads. It does not persist or upload logs. Remove the flag for normal play. The optional `onDiagnostic(entry)` constructor hook receives the same safe records for local test harnesses. A timeout at `data-channel` with failed ICE differs from a timeout at `handshake` with an open data channel; report the actual stage rather than assuming a cause.
