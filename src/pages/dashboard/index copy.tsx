import { useEffect, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { api } from "~/utils/api";
import Image from "next/image";
import Link from "next/link";

//import { IoPlayCircle } from "react-icons/io5";

import { RiPlayFill } from "react-icons/ri";
import { IoMdPause } from "react-icons/io";
import { useQuery } from "@tanstack/react-query";
import Player from "./spotifyPlayer";
import NewsPlayer from "./newsPlayer";

export default function Home() {
  const { status } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (status === "unauthenticated") {
      void router.replace("/");
    }
  }, [status, router]);

  const audioRef = useRef<HTMLAudioElement>(null);
  const sourceRef = useRef<HTMLSourceElement>(null);

  const [news, setNews] = useState(true);
  // useEffect(() => {
  //   if (newData.data !== undefined) {
  //     if (newData.data.newsSegment !== undefined) {
  //       setNews(false);
  //     }
  //     if (newData.data.musicIds !== undefined) {
  //       setMusicIds(newData.data.musicIds);
  //       setNews(true);
  //     }
  //   }
  // }, [newData.data]);

  const audiodata = api.tts.ttsNew.useQuery();
  // const gptData = api.gpt.gptAnswer.useQuery();

  const spotifyTracks = api.spotify.topTracks.useQuery();
  useEffect(() => {
    if (spotifyTracks.data !== undefined) {
      console.log(spotifyTracks.data);
    }
  });

  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = async () => {
    setIsPlaying(true);
    if (audioRef.current) {
      try {
        await audioRef.current.play();
      } catch (error) {
        console.log("playback was not possible");
      }
    }
  };

  // function askGPT() {
  //   console.log(gptData.data?.binaryString);
  // }

  useEffect(() => {
    if (sourceRef.current && audiodata.data !== undefined) {
      const arrayBuffer = new ArrayBuffer(audiodata.data.length);
      const uint8Array = new Uint8Array(arrayBuffer);
      for (let i = 0; i < audiodata.data.length; i++) {
        uint8Array[i] = audiodata.data.charCodeAt(i) & 0xff;
      }
      const blob = new Blob([arrayBuffer], { type: "audio/mp3" });
      const blobUrl = URL.createObjectURL(blob);
      sourceRef.current.src = blobUrl;
    }
  }, [audiodata.data]);

  const handlePause = () => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  if (status === "unauthenticated" || status === "loading") {
    return null;
  }
  return (
    <main className="h-screen w-screen bg-gradient-to-b from-zinc-900 to-indigo-950">
      <div className="flex h-full w-full flex-col">
        <nav className="flex h-fit w-full flex-row items-center p-8">
          <h1 className="text-xl text-slate-50">Dashboard</h1>

          <button
            className="duration-30 mx-auto mr-1 rounded-xl bg-indigo-200 px-8 py-4 text-xl font-bold text-indigo-900 transition hover:bg-emerald-300"
            onClick={() => void signOut({ callbackUrl: "/" })}
          >
            <p className="text-xl">Logout</p>
          </button>
          <Link
            href="/interests"
            className="cursor-pointer rounded-xl bg-indigo-200 px-8 py-4 text-xl font-bold text-indigo-900 transition duration-300 hover:bg-emerald-300"
          >
            Interests
          </Link>
        </nav>

        <div className={news ? "w-5/6" : "hidden"}>
          {news ? <Player /> : null}
        </div>
        <button
          onClick={() => setNews(!news)}
          className="m-2 mx-auto flex w-64 cursor-pointer items-center justify-center rounded-full bg-indigo-200 p-4 text-lg text-indigo-900 hover:bg-emerald-300"
        >
          toggle news/music player
        </button>
        {/* <button
            onClick={() => askGPT()}
            className="width-fit flex cursor-pointer items-center justify-center rounded-full bg-indigo-200 p-6 text-xl text-indigo-900 hover:bg-emerald-300"
          >
            ask the ai
          </button> */}
      </div>
    </main>
  );
}
