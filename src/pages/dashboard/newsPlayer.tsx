// NewsPlayer.js
import { useEffect, useRef } from "react";
import Image from "next/image";
import type { News, Transition } from "~/utils/GPT/GPT";
import Player from "./players";

const NewsPlayer = (props: {
  transition: Transition | undefined;
  news: News | undefined;
  setMusicPlaying: () => void;
}) => {
  const { transition, news, setMusicPlaying } = props;
  const audiodata = transition?.content;

  const audioRef = useRef<HTMLAudioElement>(null);
  const sourceRef = useRef<HTMLSourceElement>(null);

  useEffect(() => {
    if (sourceRef.current && audiodata && audioRef.current) {
      sourceRef.current.src = audiodata;
      audioRef.current.load();
    }
  }, [audiodata]);

  useEffect(() => {
    if (audioRef.current) {
      const audio = audioRef.current;

      const handleAudioEnd = () => {
        setMusicPlaying();
        console.log("Wiedergabe beendet");
      };

      if (audio) {
        audio.addEventListener("ended", handleAudioEnd);
      }
      return () => {
        if (audio) {
          audio.removeEventListener("ended", handleAudioEnd);
        }
      };
    }
  }, [setMusicPlaying]);

  const togglePlay = async () => {
    if (audioRef.current) {
      if (audioRef.current.paused) {
        try {
          await audioRef.current.play();
        } catch (error) {
          console.log("Playback was not possible");
        }
      } else {
        audioRef.current.pause();
      }
    }
  };

  return (
    <>
      <Player
        image={
          <Image
            src="/cover.png"
            alt="Album cover"
            width={320}
            height={320}
            className="hover:contrast-85 hover:saturate-125 rounded-lg shadow-lg transition-all hover:brightness-90"
          />
        }
        trackname="Titel"
        artistname="Nueslify"
        previousTrack={() => {
          return;
        }}
        togglePlay={() => togglePlay()}
        nextTrack={() => {
          return;
        }}
      />
      <audio ref={audioRef} controls hidden autoPlay>
        <source src={audiodata} ref={sourceRef} type="audio/mpeg" />
      </audio>
    </>
  );
};

export default NewsPlayer;
