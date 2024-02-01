import { useEffect, useState } from "react";
import NewsPlayer from "./newsPlayer";
import SpotifyPlayer from "./spotifyPlayer";
import type { News, Transition } from "~/utils/GPT/GPT";
import { api } from "~/utils/api";
import Player from "./players";
import SpotifyButton from "./sportifyButton";

const Body = () => {
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [music, setMusic] = useState<string[] | undefined>(undefined);
  const [currentState, setCurrentState] = useState(0);
  const [news, setNews] = useState<News | undefined>(undefined);
  const [transition, setTransition] = useState<Transition | undefined>(
    undefined,
  );

  const handleMusicPlaying = () => {
    setMusicPlaying(!musicPlaying);
    console.log("Music Playing: " + musicPlaying);
  };

  const { mutate, data } = api.mixer.mixer.useMutation();

  useEffect(() => {
    mutate();
  }, [mutate]);

  useEffect(() => {
    if (data !== undefined) {
      if (data.musicIds !== undefined) {
        console.log(data.musicIds);
        setMusic(data.musicIds);
      } else if (data.newsSegment !== undefined) {
        setNews(data.newsSegment.content as News);
      }
      setTransition(data.transitionSegment.content as Transition);
    }
  }, [data]);

  const refetchNews = (title: string, artistnames: string[]) => {
    setCurrentState(1);
    console.log(currentState);
    mutate({ title: title, artistNames: artistnames });
  };

  const refetchMusic = (newsTitle: string | undefined) => {
    mutate({
      newsTitle: newsTitle,
    });
  };

  return (
    <>
      {musicPlaying ? (
        <div>
          <SpotifyPlayer
            musicIds={music}
            setMusicPlaying={() => handleMusicPlaying()}
            refetchNews={(title, artistnames) => refetch(title, artistnames)}
          />
          <SpotifyButton />
        </div>
      ) : (
        <>
          {transition ? (
            <NewsPlayer
              currentState={currentState}
              setCurrentState={(state) => setCurrentState(state)}
              transition={transition}
              news={news}
              setMusicPlaying={() => handleMusicPlaying()}
              refetchMusic={(newsTitle) => refetchMusic(newsTitle)}
            />
          ) : (
            <Player
              isPaused={true}
              image={null}
              trackname={null}
              artistname={null}
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
          )}
        </>
      )}
    </>
  );
};

export default Body;
