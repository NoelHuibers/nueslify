// NewsPlayer.js
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { News, Transition } from "~/utils/GPT/GPT";
import Player from "./players";
import { set } from "zod";

const NewsPlayer = (props: {
  transition: Transition;
  news: News | undefined;
  setMusicPlaying: () => void;
  refetchMusic: (newsTitle: string | undefined) => void;
  currentState: number;
  setCurrentState: (state: number) => void;
}) => {
  const { setMusicPlaying, refetchMusic, setCurrentState } = props;
  const [audiodata, setAudioData] = useState<string | null>();
  const [newsTitle, setNewsTitle] = useState("Your AI Radio");
  const audioRef = useRef<HTMLAudioElement>(null);
  const sourceRef = useRef<HTMLSourceElement>(null);

  useEffect(() => {
    if (props.transition) {
      setAudioData(props.transition.content);
    }
  }, [props.transition]);

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
        if (props.currentState === 0) {
          setCurrentState(1);
          console.log("Wiedergabe der Transition zu Music beendet");
          setMusicPlaying();
        } else if (props.currentState === 1 && props.news) {
          setCurrentState(2);
          console.log("Wiedergabe der Transition zu News beendet");
          setNewsTitle(props.news.title);
          setAudioData(props.news.content);
        } else if (props.currentState === 2) {
          setCurrentState(0);
          refetchMusic(props.news?.content ? props.news.content : undefined);
        }
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

  const skip = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = audioRef.current.duration;
    }
  };

  const goToBeginning = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  return (
    <>
      <Player
        image={
          <Image
            src="/icon-512x512.png"
            alt="Nueslify Icon"
            width={320}
            height={320}
            className="hover:contrast-85 hover:saturate-125 rounded-lg shadow-lg transition-all hover:brightness-90"
          />
        }
        trackname="Nueslify"
        artistname={newsTitle}
        previousTrack={() => goToBeginning()}
        togglePlay={() => togglePlay()}
        nextTrack={() => skip()}
      />
      <audio ref={audioRef} controls hidden autoPlay>
        {audiodata ? (
          <source src={audiodata} ref={sourceRef} type="audio/mpeg" />
        ) : null}
      </audio>
    </>
  );
};

export default NewsPlayer;
