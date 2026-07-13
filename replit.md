# Kirkradio DJ

A browser-based live DJ mixing console (dual decks, waveforms, EQ, crossfader, cue points) that can broadcast the live mix straight to Kirk Radio's Icecast stream.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/kirkradio-dj` — the DJ console frontend (Web Audio API mixing engine, decks, mixer, broadcast panel)
- `artifacts/api-server/src/lib/broadcast.ts` — broadcast state machine + ffmpeg process that relays audio to Icecast
- `artifacts/api-server/src/routes/broadcast.ts` — REST endpoints (`/api/broadcast/status|start|stop`)
- `artifacts/api-server/src/index.ts` — hosts the raw WebSocket server at `/api/broadcast/ws` that receives live audio chunks from the browser
- `lib/api-spec/openapi.yaml` — API contract, including the broadcast endpoints

## Architecture decisions

- All DJ mixing (decks, EQ, crossfader, waveforms) runs client-side via the Web Audio API — no backend involved in local playback.
- Going live captures the master mix as a MediaStream, records it with `MediaRecorder` (webm/opus, ~250ms chunks), and streams chunks over a WebSocket to the API server.
- The API server pipes incoming chunks into an `ffmpeg` process that transcodes to MP3 and pushes it to Kirk Radio's Icecast mount via `ffmpeg`'s built-in icecast output.
- Broadcast credentials (`KIRKRADIO_STREAM_HOST/PORT/MOUNT/USERNAME/PASSWORD`) are server-only secrets; the frontend only ever sees `configured: boolean`.

## Product

- DJ console with two independent decks (load local audio files, play/cue/loop, 3-band EQ with kills, pitch/tempo, scrubbable waveform) and a crossfader/master mixer with real-time level meters.
- "Go Live" broadcast panel that streams the live mix to Kirk Radio's actual stream once credentials are configured.

## User preferences

- Kirk Radio DJ tool should live at the app's root and read as a real broadcast-booth tool, not a toy.

## Gotchas

- Broadcasting requires `KIRKRADIO_STREAM_HOST`, `KIRKRADIO_STREAM_PORT`, `KIRKRADIO_STREAM_MOUNT`, `KIRKRADIO_STREAM_USERNAME`, `KIRKRADIO_STREAM_PASSWORD` secrets to be set — without them the broadcast panel shows "not configured" and Go Live is disabled.
- The WebSocket audio feed is tied to broadcast lifecycle: closing the socket stops the broadcast server-side.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
