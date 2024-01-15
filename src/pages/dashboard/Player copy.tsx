import React, { useState, useEffect } from "react";
import { api } from "../../utils/api";
import { set } from "zod";
import Background from "./Background";
import { Placeholder } from "drizzle-orm";
import placeholderImage from "../../../public/photos/nueslify.png";

declare global {
  interface Window {
    Spotify: any;
    onSpotifyWebPlaybackSDKReady: () => void;
  }
}

const track = {
  name: "",
  id: "",
  album: {
    images: [{ url: "" }],
  },
  artists: [{ name: "" }],
};

const Player = () => {
  const [is_paused, setPaused] = useState(false);
  const [is_active, setActive] = useState(false);
  const [player, setPlayer] = useState(undefined);
  const [current_track, setTrack] = useState(track);
  const [previousTracksLength, setPreviousTracksLength] = useState(0);

  const accessToken = api.playback.playback.useQuery();

  const topTracks = api.spotify.topTracks.useQuery();

  useEffect(() => {
    // Function to initialize the player
    if (accessToken.data !== undefined) {
      const initializeSpotifyPlayer = () => {
        const player = new window.Spotify.Player({
          name: "Nueslify Web Player",
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

        player.addListener("player_state_changed", (state: any) => {
          if (!state) return;
          setTrack(state.track_window.current_track);
          setPaused(state.paused);
        });

        let debounceTimer: any;
        let lastTrackName = "";

        player.addListener("player_state_changed", (state: any) => {
          clearTimeout(debounceTimer);

          debounceTimer = setTimeout(() => {
            const current = state.track_window.previous_tracks.length;

            if (current !== 0) {
              const currentTrackName = state.track_window.current_track.name;

              if (lastTrackName !== "" && lastTrackName !== currentTrackName) {
                console.log(`Track "${lastTrackName}" ended`);
              }
              lastTrackName = currentTrackName;
            }

            // Update the state using setPreviousTracksLength
            setPreviousTracksLength(current);
            console.log(current);
          }, 1000); // Adjust the delay as needed
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

  const playTopTracks = () => {
    // Extracting the track IDs from topTracks
    const trackIds = topTracks.data?.map((track) => track.id);
    console.log(trackIds);

    // Constructing the uris array without adding "spotify:track:" again
    const uris = trackIds?.map((id) => id);

    fetch(`https://api.spotify.com/v1/me/player/play`, {
      method: "PUT",
      body: JSON.stringify({
        uris: uris,
        shuffle: true,
      }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken.data}`,
      },
    })
      .then((response) => response.json())
      .then((data) => console.log(data))
      .catch((error) => console.error("Error:", error));
  };

  const AddItemToPlaybackQueue = (songId: string) => {
    fetch(`https://api.spotify.com/v1/me/player/queue`, {
      method: "POST",
      body: JSON.stringify({ uris: [`spotify:track:${songId}`] }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken.data}`,
      },
    });
    console.log({ songId } && "added");
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
        <div className="text-container">
          <div className="flex min-w-max select-none flex-col justify-center rounded-lg bg-slate-50 bg-opacity-10 p-8 align-middle shadow drop-shadow-2xl backdrop-blur-md">
            <img
              src={current_track.album.images[0]?.url || placeholderImage}
              className="now-playing__cover rounded-xl"
              alt=""
              style={{ width: "300px", height: "300px" }}
            />

            <div className="now-playing__side">
              {/* <div className="now-playing__name">{current_track.id}</div> */}
              <div className="mb-2 mt-5 select-none overflow-hidden text-ellipsis text-2xl font-bold tracking-tight text-slate-50">
                {current_track.name}
              </div>
              <div className="mb-2 select-none overflow-hidden text-ellipsis text-2xl font-bold tracking-tight text-slate-50">
                {current_track.artists[0]?.name}
              </div>
              <div className="control-container m-5 flex items-center justify-center space-x-4">
                {" "}
                <button
                  className="btn-spotify"
                  onClick={() => {
                    player.previousTrack().then(() => {
                      console.log("Skipped to previous track!");
                    });
                  }}
                >
                  <svg
                    id="previous"
                    width="60"
                    height="60"
                    viewBox="0 0 30 30"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M2.33917 13.7397L12.9664 7.38149C13.2293 7.22152 13.5303 7.13509 13.8381 7.13123C14.1458 7.12737 14.4489 7.20622 14.7157 7.35955C15.0053 7.52815 15.245 7.77036 15.4107 8.0616C15.5763 8.35284 15.6619 8.68272 15.6588 9.01775V13.4657L25.8274 7.3798C26.0903 7.21983 26.3914 7.13341 26.6991 7.12955C27.0068 7.12568 27.3099 7.20454 27.5768 7.35786C27.8663 7.52646 28.1061 7.76867 28.2717 8.05991C28.4373 8.35115 28.5229 8.68103 28.5198 9.01606V21.4512C28.5231 21.7863 28.4376 22.1163 28.2719 22.4077C28.1063 22.699 27.8664 22.9413 27.5768 23.1099C27.3099 23.2632 27.0068 23.3421 26.6991 23.3382C26.3914 23.3344 26.0903 23.2479 25.8274 23.088L15.6588 16.9993V21.4489C15.6625 21.7844 15.5771 22.1149 15.4114 22.4067C15.2458 22.6985 15.0057 22.9411 14.7157 23.1099C14.4489 23.2632 14.1458 23.3421 13.8381 23.3382C13.5303 23.3344 13.2293 23.2479 12.9664 23.088L2.33917 16.7298C2.08653 16.5715 1.87825 16.3516 1.73386 16.0908C1.58948 15.83 1.51373 15.5368 1.51373 15.2387C1.51373 14.9406 1.58948 14.6473 1.73386 14.3865C1.87825 14.1257 2.08653 13.9058 2.33917 13.7476V13.7397Z"
                      fill="#E1E1E6"
                    ></path>
                  </svg>
                </button>
                <button
                  className="btn-spotify"
                  onClick={() => {
                    player.togglePlay();
                  }}
                >
                  {is_paused ? (
                    <svg
                      width="60"
                      height="60"
                      viewBox="0 0 30 30"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M8.32137 25.586C7.9759 25.5853 7.63655 25.4948 7.33669 25.3232C6.66148 24.9406 6.24173 24.1978 6.24173 23.3915V7.07398C6.24173 6.26542 6.66148 5.52494 7.33669 5.14232C7.64369 4.96589 7.99244 4.87516 8.3465 4.87961C8.70056 4.88407 9.04692 4.98354 9.34938 5.16764L23.2952 13.5155C23.5859 13.6977 23.8255 13.9508 23.9916 14.251C24.1577 14.5511 24.2448 14.8886 24.2448 15.2316C24.2448 15.5747 24.1577 15.9121 23.9916 16.2123C23.8255 16.5125 23.5859 16.7655 23.2952 16.9478L9.34713 25.2979C9.0376 25.485 8.68307 25.5846 8.32137 25.586V25.586Z"
                        fill="#E1E1E6"
                      ></path>
                    </svg>
                  ) : (
                    <svg
                      width="60"
                      height="60"
                      viewBox="0 0 255 255"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="#E1E1E6"
                    >
                      <path d="M216 48v160a16.018 16.018 0 0 1-16 16h-36a16.018 16.018 0 0 1-16-16V48a16.018 16.018 0 0 1 16-16h36a16.018 16.018 0 0 1 16 16zM92 32H56a16.018 16.018 0 0 0-16 16v160a16.018 16.018 0 0 0 16 16h36a16.018 16.018 0 0 0 16-16V48a16.018 16.018 0 0 0-16-16z" />
                    </svg>
                  )}
                </button>
                <button
                  className="btn-spotify"
                  onClick={() => {
                    player.nextTrack().then(() => {
                      console.log("Skipped to next track!");
                    });
                  }}
                >
                  <svg
                    width="60"
                    height="60"
                    viewBox="0 0 30 30"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <g clip-path="url(#clip0_42_51)">
                      <path
                        d="M27.1426 13.7397L16.5154 7.38149C16.2525 7.22152 15.9514 7.13509 15.6437 7.13123C15.336 7.12737 15.0329 7.20622 14.766 7.35955C14.4765 7.52815 14.2368 7.77036 14.0711 8.0616C13.9055 8.35284 13.8199 8.68272 13.823 9.01775V13.4657L3.65435 7.3798C3.39144 7.21983 3.0904 7.13341 2.78268 7.12955C2.47495 7.12568 2.17183 7.20454 1.905 7.35786C1.61547 7.52646 1.37571 7.76867 1.21008 8.05991C1.04445 8.35115 0.958845 8.68103 0.961955 9.01606V21.4512C0.958745 21.7863 1.0443 22.1163 1.20994 22.4076C1.37558 22.699 1.61538 22.9413 1.905 23.1099C2.17183 23.2632 2.47495 23.3421 2.78268 23.3382C3.0904 23.3344 3.39144 23.2479 3.65435 23.088L13.823 16.9993V21.4489C13.8194 21.7844 13.9048 22.1149 14.0704 22.4066C14.2361 22.6984 14.4761 22.9411 14.766 23.1099C15.0329 23.2632 15.336 23.3421 15.6437 23.3382C15.9514 23.3344 16.2525 23.2479 16.5154 23.088L27.1426 16.7298C27.3953 16.5715 27.6035 16.3516 27.7479 16.0908C27.8923 15.83 27.968 15.5368 27.968 15.2387C27.968 14.9406 27.8923 14.6473 27.7479 14.3865C27.6035 14.1257 27.3953 13.9058 27.1426 13.7476V13.7397Z"
                        fill="#E1E1E6"
                      ></path>
                    </g>
                    <defs>
                      <clipPath id="clip0_42_51">
                        <rect
                          width="28.8089"
                          height="28.8089"
                          fill="white"
                          transform="translate(0.0612183 0.828369)"
                        ></rect>
                      </clipPath>
                    </defs>
                  </svg>
                </button>
              </div>
              <div>
                {/* <button
                  className="btn-spotify"
                  onClick={() => {
                    playTopTracks();
                  }}
                >
                  playTopTracks
                </button> */}
              </div>
            </div>
          </div>
        </div>
        {/* <Background /> */}
      </>
    );
  }
};

export default Player;
