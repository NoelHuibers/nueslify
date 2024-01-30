import { useEffect, useState } from "react";
import NewsPlayer from "./newsPlayer";
import SpotifyPlayer from "./spotifyPlayer";
import type { News, Transition } from "~/utils/GPT/GPT";
import { api } from "~/utils/api";

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

  const refetchMusic = () => {
    mutate({
      newscontent: "My news",
    });
  };

  return (
    <>
      {musicPlaying ? (
        <SpotifyPlayer
          musicIds={music}
          setMusicPlaying={() => handleMusicPlaying()}
          refetchNews={(title, artistnames) => refetchNews(title, artistnames)}
        />
      ) : (
        <>
          {transition ? (
            <NewsPlayer
              currentState={currentState}
              setCurrentState={(state) => setCurrentState(state)}
              transition={transition}
              news={news}
              setMusicPlaying={() => handleMusicPlaying()}
              refetchMusic={() => refetchMusic()}
            />
          ) : null}
        </>
      )}
    </>
  );
};

export default Body;
