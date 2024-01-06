import axios from "axios";
import { eq } from "drizzle-orm";
import { env } from "~/env.mjs";
import { db } from "~/server/db";
import { accounts } from "~/server/db/schema";
import type { AxiosResponse } from "axios";

type ExternalUrls = {
  spotify: string;
};

/*type Track = {
  external_urls: ExternalUrls;
  preview_url: string;
  id: string;
  name: string;
  duration_ms: number;
};*/

type Track = {
  id: string;
  artistNames?: string[];
  artists: Artist[];
};

type Artist = {
  external_urls: ExternalUrls;
  name: string;
  id: string;
  href: string;
  type: string;
  uri: string;
};

type SpotifyResponse = {
  items: Track[];
  total: number;
  limit: number;
  offset: number;
  href: string;
  next: string | null;
  previous: string | null;
};

async function getTopTracks(accessToken: string): Promise<Track[]> {
  try {
    const response: AxiosResponse<SpotifyResponse> = await axios.get(
      "https://api.spotify.com/v1/me/top/tracks?time_range=medium_term&limit=10",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    /*const responseBody = response.data;
    const simplifiedTracks: Track[] = responseBody.items.map(
      ({ external_urls, preview_url, id, name, duration_ms, artists }: Track) => ({
        external_urls,
        preview_url,
        id,
        name,
        duration_ms,
        artists
      }),
    );*/
    const responseBody = response.data;
    const simplifiedTracks: Track[] = responseBody.items.map(
      ({ id }: Track) => ({
        id: "spotify:track:" + id,
      }),
    );

    simplifiedTracks.forEach((track) => {
      track.artistNames = track.artists.map((artist) => artist.name);
    });

    return simplifiedTracks;
  } catch (error) {
    console.error("Error getting top tracks:", error);
    throw error;
  }
}

export async function refreshSpotifyToken(userId: string): Promise<string> {
  const account = await db.query.accounts.findFirst({
    where: (accounts, { eq }) => eq(accounts.userId, userId),
  });

  if (!account?.expires_at) {
    throw new Error("No account found");
  }

  if (Date.now() >= account.expires_at * 1000) {
    if (!account.refresh_token) {
      throw new Error("No refresh token found");
    }

    const response: AxiosResponse<{
      access_token: string;
      expires_in: number;
    }> = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: account.refresh_token,
        client_id: env.SPOTIFY_CLIENT_ID,
        client_secret: env.SPOTIFY_CLIENT_SECRET,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    const refreshedTokenData = response.data;

    await db
      .update(accounts)
      .set({
        access_token: refreshedTokenData.access_token,
        expires_at: Date.now() / 1000 + refreshedTokenData.expires_in,
      })
      .where(eq(accounts.userId, userId));

    return refreshedTokenData.access_token;
  }
  if (!account.access_token) {
    throw new Error("No access token found");
  }

  return account.access_token;
}

export default getTopTracks;
