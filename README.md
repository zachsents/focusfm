# Focus FM

Focus FM is a local-first browser sound mixer for building an endless personal
focus environment. It combines real field recordings with procedurally
generated noise, rhythm, and musical layers through the Web Audio API. There are
no accounts, uploads, or database; mixes and named presets stay in
`localStorage` on the current device.

## Stack

- TanStack Start and TanStack Router
- React 19 and TypeScript
- Tailwind CSS 4 with shadcn/ui on Base UI
- React Bits Elastic Slider with Motion
- Zod-validated local persistence
- Web Audio API synthesis and bar-quantized playback
- SoundTouch AudioWorklet pitch-preserving tempo sync
- Bun, Oxlint, and Prettier

## Development

```sh
bun install
bun run dev
```

The app is available at `http://localhost:3000`.

## Quality checks

```sh
bun run check
bun run build
```

Use `bun run fix` while developing to typecheck, apply safe lint fixes, and
format the project.
