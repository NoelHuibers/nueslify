import axios, { AxiosResponse } from "axios";

type ExternalUrls = {
  spotify: string;
};

type Track = {
  external_urls: ExternalUrls;
  preview_url: string;
  id: string;
  name: string;
  duration_ms: number;
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
      "https://api.spotify.com/v1/me/top/tracks?time_range=short_term&limit=10",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    const responseBody = response.data;
    const simplifiedTracks: Track[] = responseBody.items.map(
      ({ external_urls, preview_url, id, name, duration_ms }: Track) => ({
        external_urls,
        preview_url,
        id,
        name,
        duration_ms,
      }),
    );

    return simplifiedTracks;
  } catch (error) {
    console.error("Error getting top tracks:", error);
    throw error;
  }
}
export default getTopTracks;
