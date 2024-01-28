import { useEffect, useState } from "react";
import NewsPlayer from "./newsPlayer";
import SpotifyPlayer from "./spotifyPlayer";
import type { News, Transition } from "~/utils/GPT/GPT";
import { api } from "~/utils/api";

const Body = () => {
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [music, setMusic] = useState<string[] | undefined>(undefined);
  const [lastSong, setLastSong] = useState(true);
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
        setLastSong(false);
      } else if (data.newsSegment !== undefined) {
        setNews(data.newsSegment.content as News);
      }
      setTransition(data.transitionSegment.content as Transition);
    }
  }, [data]);

  useEffect(() => {
    if (lastSong) {
      // mixer.mutate(mixer.data);
    }
  }, [lastSong]);

  return (
    <>
      {musicPlaying ? (
        <SpotifyPlayer musicIds={music} />
      ) : (
        <NewsPlayer
          transition={transition}
          news={news}
          setMusicPlaying={() => handleMusicPlaying()}
        />
      )}
    </>
  );
};

export default Body;
