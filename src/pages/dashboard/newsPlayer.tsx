// NewsPlayer.js
import { useEffect, useRef } from "react";
import Image from "next/image";
import type { News, Transition } from "~/utils/GPT/GPT";
import Player from "./players";

const NewsPlayer = (props: {
  transition: Transition | undefined;
  news: News | undefined;
}) => {
  const audiodata = props.news?.content;

  const audioRef = useRef<HTMLAudioElement>(null);
  const sourceRef = useRef<HTMLSourceElement>(null);

  useEffect(() => {
    if (sourceRef.current && audiodata !== undefined) {
      const arrayBuffer = new ArrayBuffer(audiodata.length);
      const uint8Array = new Uint8Array(arrayBuffer);
      for (let i = 0; i < audiodata.length; i++) {
        uint8Array[i] = audiodata.charCodeAt(i) & 0xff;
      }
      const blob = new Blob([arrayBuffer], { type: "audio/mp3" });
      const blobUrl = URL.createObjectURL(blob);
      sourceRef.current.src = blobUrl;
    }
  }, [audiodata]);

  const handlePlay = async () => {
    if (audioRef.current) {
      try {
        await audioRef.current.play();
      } catch (error) {
        console.log("Playback was not possible");
      }
    }
  };

  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
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
        pauseTrack={handlePause}
        nextTrack={() => {
          return;
        }}
      />
      <audio ref={audioRef} className="hidden">
        <source ref={sourceRef} className="hidden" />
      </audio>
    </>
  );
};

export default NewsPlayer;
