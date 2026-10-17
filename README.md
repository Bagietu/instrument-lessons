# Instrument Lessons

One web app to learn piano, guitar and singing, with the microphone listening as you play.

Live at https://bagietu.github.io/instrument-lessons/

## Develop

```sh
npm install
npm run dev     # local dev server
npm test        # unit tests
npm run build   # production build into dist/
```

## How it works

- `src/audio/pitch.ts` detects the note being played or sung (YIN algorithm).
- `src/audio/useMicPitch.ts` reads the microphone and feeds it to the detector.
- `src/instruments.ts` lists the instruments and the pitch range each one listens for.
- `src/audio/follower.ts` checks the notes of a lesson as they are played.
- `src/lessons/lessons.json` holds every lesson; `src/lessons/format.ts` defines the lesson format and its validation.
- The admin panel (`#/admin`) saves lessons by committing `lessons.json` to this repository, and can draft lessons with Claude.
- Pages use hash routes (`#/guitar/tuner`, `#/admin`) so they work on GitHub Pages.

To use the admin panel, follow [SETUP.md](SETUP.md).

Every push to `main` is tested and deployed by `.github/workflows/deploy.yml`.
