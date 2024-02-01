//spotifyPlayer.tsx
import React, { useState, useEffect } from "react";
import { api } from "../../utils/api";
import Image from "next/image";
import axios from "axios";
import Player from "./players";

declare global {
  interface Window {
    Spotify: typeof Spotify;
    onSpotifyWebPlaybackSDKReady: () => void;
  }
}

const Spotifyplayer = (props: {
  musicIds: string[] | undefined;
  setMusicPlaying: () => void;
  refetchNews: (title: string, artistnames: string[]) => void;
}) => {
  const [songAmount, setSongAmount] = useState<number | undefined>(undefined);
  const [is_paused, setPaused] = useState(true);
  const [is_active, setActive] = useState(false);
  const [player, setPlayer] = useState<Spotify.Player | undefined>(undefined);
  const [current_track, setTrack] = useState<Spotify.Track | undefined>(
    undefined,
  );
  const [previousTracksLength, setPreviousTracksLength] = useState(0);

  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);

  const [albumImage, setAlbumImage] = useState<string | undefined>(undefined);

  const accessToken = api.playback.playback.useQuery();

  const [imageLoading, setImageLoading] = useState(true);
  const [nameLoading, setNameLoading] = useState(true);
  const [artistLoading, setArtistLoading] = useState(true);

  useEffect(() => {
    if (props.musicIds !== undefined) {
      setSongAmount(props.musicIds.length);
      console.log("Song amount set to", props.musicIds.length);
    }
  }, [props.musicIds]);

  useEffect(() => {
    // Function to initialize the player
    if (accessToken.data !== undefined) {
      const initializeSpotifyPlayer = () => {
        const player = new window.Spotify.Player({
          name: "Nueslify Web Player",
          getOAuthToken: (cb) => {
            cb(accessToken.data);
          },
        });

        setPlayer(player);

        // Setup event listeners
        player.addListener("ready", (playbackInstance) => {
          console.log("Ready with Device ID", playbackInstance.device_id);
          void transferPlaybackHere(
            playbackInstance.device_id,
            accessToken.data,
          ).then(() => {
            setDeviceId(playbackInstance.device_id);
            setActive(true);
          });
        });

        // Connect to the player!
        void player.connect().then((_) => {
          player.addListener("player_state_changed", (playbackState) => {
            setTrack(playbackState.track_window.current_track);
            setPaused(playbackState.paused);
            setImageLoading(false);
            setNameLoading(false);
            setArtistLoading(false);

            setTrack(playbackState.track_window.current_track);
            setAlbumImage(
              playbackState.track_window.current_track.album.images[0]?.url
                ? playbackState.track_window.current_track.album.images[0]?.url
                : "",
            );
            setPaused(playbackState.paused);
          });
        });

        let debounceTimer: NodeJS.Timeout;
        let lastTrackName = "";

        player.addListener("player_state_changed", (playbackState) => {
          clearTimeout(debounceTimer);

          debounceTimer = setTimeout(() => {
            const current = playbackState.track_window.previous_tracks.length;

            if (current !== 0) {
              const currentTrackName =
                playbackState.track_window.current_track.name;

              if (lastTrackName !== "" && lastTrackName !== currentTrackName) {
                console.log(`Track "${lastTrackName}" ended`);
                setSongAmount((previous) => {
                  if (previous !== undefined) {
                    return previous - 1;
                  } else {
                    return undefined;
                  }
                });
              }
              lastTrackName = currentTrackName;
            }
            setPreviousTracksLength(current);
          }, 0);
        });
      };

      if (window.Spotify) {
        initializeSpotifyPlayer();
      } else {
        window.onSpotifyWebPlaybackSDKReady = initializeSpotifyPlayer;
        const scriptTag = document.createElement("script");
        scriptTag.src = "https://sdk.scdn.co/spotify-player.js";
        document.head.appendChild(scriptTag);
      }
    }
  }, [accessToken.data]);

  useEffect(() => {
    if (accessToken.data !== undefined && deviceId !== undefined) {
      if (props.musicIds?.[0] !== undefined) {
        void playSong(props.musicIds[0], accessToken.data, deviceId).then(
          async () => {
            for (let i = 1; i < props.musicIds!.length; ++i) {
              await queSong(props.musicIds![i]!, accessToken.data, deviceId);
            }
          },
        );
      }
    }
  }, [props.musicIds, deviceId, accessToken.data]);

  useEffect(() => {
    if (songAmount === 0) {
      console.log("Switching to news");
      player
        ?.togglePlay()
        .then(() => {
          props.setMusicPlaying();
        })
        .catch((error) => {
          console.log(error);
        });
    }
    if (songAmount === 1) {
      const artists = current_track?.artists.map((artist) => {
        return artist.name;
      });
      if (current_track?.name && artists) {
        props.refetchNews(current_track.name, artists);
      }
    }
  }, [songAmount]);

  const nextTrack = async () => {
    if (player && songAmount == 1) {
      console.log("Switching to news");
      await player.togglePlay();
      props.setMusicPlaying();
    } else if (player) {
      await player.nextTrack();
    }
  };

  if (player && is_active && albumImage) {
    return (
      <Player
        image={
          <Image
            src={albumImage}
            alt="Album cover"
            width={320}
            height={320}
            className="hover:contrast-85 hover:saturate-125 rounded-lg shadow-lg transition-all hover:brightness-90"
            onLoad={() => setImageLoading(false)}
          />
        }
        trackname={current_track?.name ? current_track?.name : ""}
        artistname={
          current_track?.artists[0]?.name ? current_track?.artists[0]?.name : ""
        }
        previousTrack={async () => {
          await player.previousTrack();
        }}
        togglePlay={async () => {
          await player.togglePlay();
        }}
        nextTrack={async () => {
          await nextTrack();
        }}
      />
    );
  } else {
    return (
      <Player
        image={null}
        trackname="Loading"
        artistname="Loading"
        previousTrack={() => {
          return;
        }}
        togglePlay={() => {
          return;
        }}
        nextTrack={() => {
          return;
        }}
      />
    );
  }
};

const queSong = async (
  songId: string,
  accessToken: string,
  deviceId?: string,
) => {
  try {
    let url = `https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(
      songId,
    )}`;

    if (deviceId) {
      url += `&device_id=${encodeURIComponent(deviceId)}`;
    }

    const headers = {
      Authorization: `Bearer ${accessToken}`,
    };

    const response = await axios.post(url, null, { headers });

    if (response.status === 204) {
      console.log("Song added to queue successfully.");
    } else if (response.status === 202) {
      console.log("Song is accepted and being processed.");
    } else {
      console.log("Response status:", response.status);
    }
  } catch (error) {
    console.error("Error adding song to queue:", error);
  }
};

const playSong = async (
  songId: string,
  accessToken: string,
  deviceId?: string,
) => {
  try {
    let endpoint = "https://api.spotify.com/v1/me/player/play";

    if (deviceId) {
      endpoint += `?device_id=${encodeURIComponent(deviceId)}`;
    }

    await axios.put(
      endpoint,
      {
        uris: [songId],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    console.log("First song plays");
  } catch (error) {
    console.error("Error starting first song:", error);
  }
};

const transferPlaybackHere = async (device_id: string, accessToken: string) => {
  try {
    const response = await axios.put(
      "https://api.spotify.com/v1/me/player",
      {
        device_ids: [device_id],
        play: true,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    console.log("Transfer Playback response", response);
  } catch (error) {
    console.error("Transfer Playback error", error);
  }
};

export default Spotifyplayer;
