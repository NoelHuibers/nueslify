# Nüslify

npm run dev

## Architecture

### WebApp

- Frontend: TypeScript
- Backend: TypeScript, Node.js, Next.js, tRPC
- Datenbank: Dokumentenbasiert: MongoDB/MariaDB/FireStore:
  - Jeder Nutzer hat eine Sammlung die nach seiner ID bennant wird.
  - Jede Sammlung hat Dokumente für jede Interaktion.
  - InitDokument, Skipetc.Dokument, FavouritsDokument.

## Team Responsibilities

**Noel:**

- [x] Init
- [x] Landingpage
- [x] Spotify Authentifizierung
- [x] CI Pipeline
- [ ] Dashboard

**Basti**

- [ ] Ansprechen der Spotify API Bsp.: Letzten Song abspielen (Lieblingssongs Playlist spotify)

**Anton & Peter**

- [ ] News herbekommen (Webcrawlen/API): Irgendwas
- [ ] Text To Speech

**Gabriel**

- [ ] LLM anbinden (OpenAI? Api Zugriff)

**Offen**

- [ ] Mixer
- [ ] Andere Features
- [ ] Init Buttons
- [ ] Datenbankanbindung (Userdata)
- [ ] Dokumentation
