# Nüslify

npm run dev

## Architecture

### Progressive WebApp

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
- [x] Dashboard
- [x] PWA Configuration
- [ ] Datenbankanbindung (Userdata)

**Basti**

- [ ] Ansprechen der Spotify API Bsp.: Letzten Song abspielen (Lieblingssongs Playlist spotify)
- [ ] URIs der Playlists bekommen

**Anton & Peter**

- [ ] News herbekommen (Webcrawlen/API): Irgendwas
- [x] Text To Speech
- [ ] Init Buttons

**Gabriel**

- [ ] LLM anbinden (OpenAI? Api Zugriff)

**Offen**

- [ ] Mixer
- [ ] Andere Features
- [ ] Dokumentation
