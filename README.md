# Instrument Lessons

One web app to learn piano, guitar and singing, with the microphone listening as you play.

Live at https://bagietu.github.io/instrument-lessons/

## Develop

```sh
npm install
npm run dev     # local dev server
npm test        # pitch detection tests
npm run build   # production build into dist/
```

## How it works

- `src/audio/pitch.ts` detects the note being played or sung (YIN algorithm).
- `src/audio/useMicPitch.ts` reads the microphone and feeds it to the detector.
- `src/instruments.ts` lists the instruments and the pitch range each one listens for.
- Pages use hash routes (`#/guitar/tuner`) so they work on GitHub Pages.

Every push to `main` is tested and deployed by `.github/workflows/deploy.yml`.
