import { createFileRoute } from "@tanstack/react-router";
import {
  OperatorAddress,
  OperatorContact,
  PublicPage,
  PublicSection,
} from "#/components/public-page.tsx";
import { MUSIC_DATA_DESCRIPTION, OPERATOR } from "#/lib/legal.ts";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Privacy policy · Nueslify" }] }),
  component: PrivacyPage,
});

const US_TRANSFER =
  "Data may be processed in the USA. Such transfers rely on the EU–U.S. Data Privacy Framework (Art. 45 GDPR) where the provider is certified under it, and otherwise on the EU standard contractual clauses (Art. 46(2)(c) GDPR).";

function PrivacyPage() {
  return (
    <PublicPage title="Privacy policy">
      <PublicSection title="Who is responsible">
        <p>The controller under Art. 4(7) GDPR is:</p>
        <OperatorAddress />
        <OperatorContact />
      </PublicSection>

      <PublicSection title="Hosting and server logs">
        <p>
          Nueslify runs on Vercel (Vercel Inc., USA). When you open a page, Vercel processes the
          technical data your browser sends with every request: your IP address, the date and time,
          the page requested and your browser's identification (user agent). This is needed to
          deliver the site and keep it secure. Legal basis: Art. 6(1)(f) GDPR. {US_TRANSFER}
        </p>
        <p>
          Nueslify's own logs record technical events, such as a news feed that failed to load, and
          no information about you.
        </p>
      </PublicSection>

      <PublicSection title="Your account">
        <p>
          To create an account you enter your name, e-mail address and a password. The password is
          stored only as a hash. If you sign in with Spotify instead, Spotify gives us your Spotify
          user ID, your display name and, where Spotify shares them, your e-mail address and profile
          picture.
        </p>
        <p>
          When you sign in, we store a session together with your IP address and browser
          identification. A session stays valid for 30 days and is renewed while you use Nueslify.
          To slow down password guessing, the server also counts requests per IP address in memory
          for one minute.
        </p>
        <p>
          Legal basis: Art. 6(1)(b) GDPR for the account itself; Art. 6(1)(f) GDPR for the IP
          address and browser identification, which we use to protect your account. You can delete
          your account in Settings at any time, which deletes it and all data linked to it.
        </p>
      </PublicSection>

      <PublicSection title="Your show">
        <p>
          We store your show settings (the name the host calls you, language, host style and voice,
          region, news topics and outlets, music settings), the stories you have heard and the
          stories you save. Your listening history keeps the host from repeating stories and fills
          your History page. This data is kept until you delete your account.
        </p>
        <p>
          The host's personal recordings, such as your greeting, can contain your name and song
          titles. They are stored with their transcript and deleted after two days. News summaries
          are shared between listeners and contain no personal data.
        </p>
        <p>
          All of this is stored in our database, which is hosted by Turso. Legal basis: Art. 6(1)(b)
          GDPR.
        </p>
      </PublicSection>

      <PublicSection title="The AI host">
        <p>
          The host's words are written by a language model and spoken by a text-to-speech model,
          provided by OpenAI or Google (Gemini API). The language model you choose in Settings
          writes the script; if it is not available, the other one does. It receives the name the
          host calls you, your region if you chose one, the show language and host style, the time
          of day and the text of the news story. If &ldquo;Host mentions songs by name&rdquo; is on
          in Settings, it also receives the title and artists of the songs around each moderation.
          The finished script goes to the speech model (OpenAI, or Google if OpenAI is not
          available).
        </p>
        <p>
          We do not send your e-mail address, your account ID or your listening history to these
          providers. Legal basis: Art. 6(1)(b) GDPR, because the personal show is the service you
          asked for. {US_TRANSFER}
        </p>
      </PublicSection>

      <PublicSection title="Music services">
        <p>{MUSIC_DATA_DESCRIPTION}</p>
        <p>
          The access tokens of connected services are stored encrypted. When your show is put
          together, our server fetches your favourites from the service and keeps them in memory for
          up to 15 minutes; they are not stored in our database. Disconnecting a service in Settings
          deletes its tokens.
        </p>
        <p>
          Songs play in each service's own player: Spotify's embedded player (open.spotify.com),
          YouTube's player (youtube.com), Apple's MusicKit (music.apple.com) or TIDAL's web player.
          Your browser connects to a service the first time your show includes music from it. Music
          from Audius and Jamendo streams directly from their servers. These services receive your
          IP address and browser data, may store cookies or similar data on your device, and process
          this data under their own privacy policies. In addition, every page asks your browser to
          open a connection to open.spotify.com in advance so Spotify playback starts faster, which
          shows Spotify your IP address.
        </p>
        <p>
          Legal basis: Art. 6(1)(b) GDPR for the music service you chose; access to your device by
          the players is necessary to play the music you asked for (§ 25(2) No. 2 TDDDG).
        </p>
      </PublicSection>

      <PublicSection title="News">
        <p>
          Our server fetches stories from tagesschau and the other outlets' public feeds. No data
          about you is sent to them. When you open an article link, you leave Nueslify and the
          outlet's own privacy policy applies.
        </p>
      </PublicSection>

      <PublicSection title="Cookies and local storage">
        <p>Nueslify uses only what it needs to work:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <code>better-auth.session_token</code> keeps you signed in for up to 30 days.
          </li>
          <li>
            <code>better-auth.session_data</code> holds a signed copy of your session for 5 minutes,
            so not every page needs a database lookup.
          </li>
          <li>
            <code>better-auth.state</code> protects sign-in with Spotify and connecting a music
            service against forged requests, for 5 minutes.
          </li>
          <li>
            Your browser's local storage keeps your light or dark theme choice (
            <code>nueslify-theme</code>). It never leaves your device.
          </li>
          <li>
            A service worker stores the app's static files in your browser so Nueslify can show an
            offline page.
          </li>
        </ul>
        <p>
          On https the cookie names start with <code>__Secure-</code>. Legal basis: § 25(2) No. 2
          TDDDG and Art. 6(1)(b) GDPR. Nueslify uses no analytics, advertising or tracking.
        </p>
      </PublicSection>

      <PublicSection title="Contacting us">
        <p>
          If you e-mail us at{" "}
          <a className="underline underline-offset-4" href={`mailto:${OPERATOR.email}`}>
            {OPERATOR.email}
          </a>
          , we use your address and message only to answer you (Art. 6(1)(b) or (f) GDPR) and delete
          them once the matter is settled, unless the law requires us to keep them.
        </p>
      </PublicSection>

      <PublicSection title="Your rights">
        <p>
          You have the right to access your data (Art. 15 GDPR), to have it corrected (Art. 16),
          deleted (Art. 17) or its processing restricted (Art. 18), and to receive it in a portable
          format (Art. 20). Where we rely on Art. 6(1)(f) GDPR, you can object to the processing on
          grounds relating to your particular situation (Art. 21). To use these rights, e-mail us.
          You can also delete your account or disconnect music services yourself in Settings.
        </p>
        <p>
          You also have the right to lodge a complaint with a data protection supervisory authority
          (Art. 77 GDPR), in particular in the Member State of your habitual residence, your place
          of work or the place of the alleged infringement.
        </p>
      </PublicSection>

      <p className="text-muted-foreground text-sm">Last updated: November 2026.</p>
    </PublicPage>
  );
}
