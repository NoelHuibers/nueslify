import { useEffect, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { api } from "~/utils/api";
import Link from "next/link";

//import { IoPlayCircle } from "react-icons/io5";

import { SlControlPlay } from "react-icons/sl";
import { SlControlPause } from "react-icons/sl";

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();

  const audioRef = useRef<HTMLAudioElement>(null);
  const sourceRef = useRef<HTMLSourceElement>(null);
  const spotifySong = useRef<HTMLIFrameElement>(null);

  const [news, setNews] = useState(true);

  const audiodata = api.tts.ttsNew.useQuery();

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

  useEffect(() => {
    if (!session) {
      void router.replace("/");
    }
  }, [session, router]);

  if (!session) {
    return null;
  }

  return (
    <main className="h-screen w-screen bg-gradient-to-b from-zinc-900 to-indigo-950">
      <div className="flex h-full w-full flex-col">
        <nav className="flex h-fit w-full flex-row items-center p-8 ">
          <h1 className="text-xl text-slate-50">Dashboard</h1>

          <button
            className="duration-30 mx-auto mr-1 rounded-xl bg-indigo-200 px-8 py-4 text-xl font-bold text-indigo-900 transition hover:bg-emerald-300"
            onClick={() => void signOut()}
          >
            <p className="text-xl">Logout</p>
          </button>
          <Link
            href="/interests"
            className="cursor-pointer rounded-xl bg-indigo-200 px-8 py-4 text-xl font-bold text-indigo-900 transition duration-300 hover:bg-emerald-300"
          >
            Choose Interests
          </Link>
        </nav>
        <div className="flex h-full w-full flex-col items-center justify-center space-y-8">
          <div className={news ? "" : "hidden"}>
            {isPlaying ? (
              <button
                onClick={handlePause}
                className="flex cursor-pointer items-center justify-center rounded-full bg-indigo-200 p-6 hover:bg-emerald-300"
              >
                <SlControlPause className="h-8 w-8 text-indigo-900" />
              </button>
            ) : (
              <button
                onClick={handlePlay}
                className="flex cursor-pointer items-center justify-center rounded-full bg-indigo-200 p-6 hover:bg-emerald-300"
              >
                <SlControlPlay className="h-8 w-8 text-indigo-900" />
              </button>
            )}
            {audiodata.isFetched ? (
              <audio ref={audioRef} controls hidden>
                <source ref={sourceRef} src="" type="audio/mp3" />
              </audio>
            ) : null}
          </div>
          <div className={news ? "hidden" : "w-5/6"}>
            <iframe
              ref={spotifySong}
              className="border-radius:12px"
              src="https://open.spotify.com/embed/track/1VNvsvEsUpuUCbHpVop1vo"
              width="100%"
              height="352"
              loading="lazy"
            ></iframe>
          </div>
          <button
            onClick={() => setNews(!news)}
            className="width-fit flex cursor-pointer items-center justify-center rounded-full bg-indigo-200 p-6 text-xl text-indigo-900 hover:bg-emerald-300"
          >
            toggle news/music player
          </button>
        </div>
      </div>
    </main>
  );
}
