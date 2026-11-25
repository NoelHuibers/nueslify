export const MUSIC_DATA_DESCRIPTION =
  "When you connect a music service, Nueslify only asks for read access to your favourites (for example Spotify's user-top-read, YouTube's youtube.readonly, TIDAL's collection.read — plus TIDAL's playback permission so its player can stream). If you choose so in Settings, song titles and artist names are passed to the AI that writes the host's moderation; turn off \u201cHost mentions songs by name\u201d to prevent that.";

/** Operator facts for the Impressum (§ 5 DDG) and the privacy policy. */
export const OPERATOR = {
  name: "Noel Huibers",
  address: ["c/o Impressumservice Dein-Impressum", "Stettiner Str. 41", "35410 Hungen", "Germany"],
  phone: "+49 157 9234 1658",
  email: "nueslify@huibers.io",
} as const;
