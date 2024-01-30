import { useEffect, useState } from "react";
import NewsPlayer from "./newsPlayer";
import SpotifyPlayer from "./spotifyPlayer";
import type { News, Transition } from "~/utils/GPT/GPT";
import { api } from "~/utils/api";
import { Skeleton } from "~/components/ui/skeleton";
import { Card } from "~/components/ui/card";

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
          ) : (
            <div className="left-0 top-0 flex w-screen select-none items-center justify-center space-y-8">
              <Card className="flex min-w-max max-w-max flex-col justify-center p-8 align-middle">
                <Skeleton className="h-80 w-80" />
                <div
                  className="overflow-hidden whitespace-nowrap"
                  style={{ width: 300 }}
                >
                  <p className="mb-2 mt-0 select-none truncate text-xl font-bold tracking-tight text-slate-50" />
                  <p className="mb-2 mt-0 select-none truncate text-xl font-bold tracking-tight text-slate-50" />
                </div>
                <div className="control-container m-5 flex items-center justify-center space-x-4"></div>
              </Card>
            </div>
          )}
        </>
      )}
    </>
  );
};

export default Body;
