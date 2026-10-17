import { decodeJwt, decodeProtectedHeader, exportPKCS8, generateKeyPair } from "jose";
import { describe, expect, it } from "vitest";
import { parseAppleSongs, signDeveloperToken } from "./apple-music.ts";

describe("signDeveloperToken", () => {
  it("creates an ES256 MusicKit token bound to our origin", async () => {
    const { privateKey } = await generateKeyPair("ES256", { extractable: true });
    const pem = await exportPKCS8(privateKey);
    const now = Date.UTC(2026, 9, 17);

    const { value, expiresAt } = await signDeveloperToken(
      {
        teamId: "TEAM123456",
        keyId: "KEY1234567",
        privateKey: pem,
        origin: "https://nueslify.app",
      },
      now,
    );

    expect(decodeProtectedHeader(value)).toEqual({ alg: "ES256", kid: "KEY1234567" });
    const claims = decodeJwt(value);
    expect(claims).toMatchObject({ iss: "TEAM123456", origin: ["https://nueslify.app"] });
    expect(claims.iat).toBe(now / 1000);
    // Apple allows at most six months; we use twelve hours.
    expect((claims.exp ?? 0) - (claims.iat ?? 0)).toBe(12 * 3600);
    expect(expiresAt).toBe(now + 12 * 3_600_000);
  });

  it("accepts keys whose newlines were escaped in an env var", async () => {
    const { privateKey } = await generateKeyPair("ES256", { extractable: true });
    const escaped = (await exportPKCS8(privateKey)).replaceAll("\n", "\\n");
    await expect(
      signDeveloperToken({ teamId: "T", keyId: "K", privateKey: escaped, origin: "https://x.y" }),
    ).resolves.toHaveProperty("value");
  });
});

describe("parseAppleSongs", () => {
  it("keeps catalog songs and library songs that have a catalog id", () => {
    const tracks = parseAppleSongs({
      data: [
        {
          id: "1440818839",
          type: "songs",
          attributes: {
            name: "Blinding Lights",
            artistName: "The Weeknd",
            durationInMillis: 200_040,
            url: "https://music.apple.com/de/album/blinding-lights/1488408555?i=1440818839",
            playParams: { id: "1440818839", kind: "song" },
          },
        },
        {
          id: "i.abc",
          type: "library-songs",
          attributes: {
            name: "Library copy",
            artistName: "Someone",
            playParams: { id: "i.abc", kind: "song", catalogId: "999" },
          },
        },
        {
          id: "i.upload",
          type: "library-songs",
          attributes: {
            name: "My upload",
            artistName: "Me",
            playParams: { id: "i.upload", kind: "song" },
          },
        },
      ],
    });
    expect(tracks.map((t) => [t.id, t.name])).toEqual([
      ["1440818839", "Blinding Lights"],
      ["999", "Library copy"],
    ]);
    expect(tracks[1]?.url).toBe("https://music.apple.com/song/999");
    expect(tracks[0]?.durationMs).toBe(200_040);
  });
});
