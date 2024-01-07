import React, { useState, useEffect } from "react";
import { api } from "../../utils/api";
import { set } from "zod";

declare global {
  interface Window {
    Spotify: any;
    onSpotifyWebPlaybackSDKReady: () => void;
  }
}

const track = {
  name: "",
  album: {
    images: [{ url: "" }],
  },
  artists: [{ name: "" }],
};

export default function Home() {
  const [is_paused, setPaused] = useState(false);
  const [is_active, setActive] = useState(false);
  const [player, setPlayer] = useState(undefined);
  const [current_track, setTrack] = useState(track);

  const accessToken = api.playback.playback.useQuery();
  useEffect(() => {
    // Function to initialize the player
    if (accessToken.data !== undefined) {
      const initializeSpotifyPlayer = () => {
        const player = new window.Spotify.Player({
          name: "Your App Name",
          getOAuthToken: (cb: any) => {
            cb(accessToken.data);
          },
        });

        setPlayer(player);

        // Setup event listeners
        player.addListener("ready", ({ device_id }: any) => {
          console.log("Ready with Device ID", device_id);
          transferPlaybackHere(device_id);
          setActive(true);
        });

        // Connect to the player!
        player.connect();

        // Listening for end of song
        player.addListener("player_state_changed", (state: any) => {
          if (!state) return;
          setTrack(state.track_window.current_track);
          setPaused(state.paused);
          const { position, duration } = state;
          if (duration - position < 1500 && !state.paused) {
            queueNextSong();
          }
        });
      };

      // Load Spotify SDK script and initialize player
      if (window.Spotify) {
        initializeSpotifyPlayer();
      } else {
        // Attach to window onSpotifyWebPlaybackSDKReady
        window.onSpotifyWebPlaybackSDKReady = initializeSpotifyPlayer;

        // Load the Spotify SDK script
        const scriptTag = document.createElement("script");
        scriptTag.src = "https://sdk.scdn.co/spotify-player.js";
        document.head.appendChild(scriptTag);
      }
    }
  }, [accessToken.data]);

  const playSong = (songId: string) => {
    fetch(`https://api.spotify.com/v1/me/player/play`, {
      method: "PUT",
      body: JSON.stringify({ uris: [`spotify:track:${songId}`] }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken.data}`,
      },
    });
  };

  const queueNextSong = () => {
    // Replace with logic to determine the next song ID
    const nextSongId = "5ouMZCfMxMNxffPX5BR8K4";
    playSong(nextSongId);
  };

  const transferPlaybackHere = (device_id: string) => {
    fetch("https://api.spotify.com/v1/me/player", {
      method: "PUT",
      body: JSON.stringify({ device_ids: [device_id], play: true }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken.data}`, // Your Spotify access token
      },
    })
      .then((response) => {
        console.log("Transfer Playback response", response);
      })
      .catch((error) => {
        console.error("Transfer Playback error", error);
      });
  };

  if (!is_active) {
    return (
      <>
        <div className="container">
          <div className="main-wrapper">
            <b>
              {" "}
              Instance not active. Transfer your playback using your Spotify app{" "}
            </b>
          </div>
        </div>
      </>
    );
  } else {
    return (
      <>
        <div className="container">
          <div className="main-wrapper">
            <img
              src={current_track.album.images[0]?.url}
              className="now-playing__cover"
              alt=""
            />

            <div className="now-playing__side">
              <div className="now-playing__name">{current_track.id}</div>
              <div className="now-playing__artist">
                {current_track.artists[0]?.name}
              </div>

              <button
                className="btn-spotify"
                onClick={() => {
                  player.previousTrack();
                }}
              >
                &lt;&lt;
              </button>

              <button
                className="btn-spotify"
                onClick={() => {
                  player.togglePlay();
                }}
              >
                {is_paused ? "PLAY" : "PAUSE"}
              </button>

              <button
                className="btn-spotify"
                onClick={() => {
                  player.nextTrack();
                }}
              >
                &gt;&gt;
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }
}
