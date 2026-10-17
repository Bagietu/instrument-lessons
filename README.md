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
- `supabase/functions/_shared/lesson.ts` defines the lesson format and its validation, shared by the app and the server.
- `supabase/functions/admin/` is the password-protected admin API (save, delete, import, generate with Claude).
- Lessons load from Supabase when it is connected and has lessons, otherwise from `src/lessons/data.ts`.
- Pages use hash routes (`#/guitar/tuner`, `#/admin`) so they work on GitHub Pages.

To connect the database and admin panel, follow [SETUP.md](SETUP.md).

Every push to `main` is tested and deployed by `.github/workflows/deploy.yml`.
