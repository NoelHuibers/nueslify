import { useEffect, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { api } from "~/utils/api";
import Image from "next/image";
import Link from "next/link";

//import { IoPlayCircle } from "react-icons/io5";

import { RiPlayFill } from "react-icons/ri";
import { IoMdPause } from "react-icons/io";

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();

  const audioRef = useRef<HTMLAudioElement>(null);
  const sourceRef = useRef<HTMLSourceElement>(null);
  const spotifySong = useRef<HTMLIFrameElement>(null);

  const [news, setNews] = useState(true);

  const audiodata = api.tts.ttsNew.useQuery();

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
          {/* */}
          {/* Player Section */}
          <div className={news ? "hidden" : "w-5/6"}>
            <div className="flex items-center justify-between rounded-lg bg-purple-700 p-4 shadow-lg">
              {/* Album Cover */}
              <div className="w-1/6 p-5">
                <Image
                  src="/cover.png"
                  alt="Album cover"
                  layout="responsive"
                  height={500}
                  width={500}
                  className="hover:contrast-85 hover:saturate-125 cursor-pointer rounded-lg shadow-lg transition-all hover:brightness-90"
                />
              </div>
              <div className="flex-grow px-4">
                <h2 className="text-lg font-bold text-slate-50">
                  Your Daily Newsflash
                </h2>
                <p className="text-sm text-slate-50">Nueslify AI-Radio</p>
              </div>

              <div className="w-1/8 yrelative h-full items-end py-3 pr-0.5">
                {isPlaying ? (
                  <button
                    onClick={handlePause}
                    className="hover:tranform bottom-0 right-0  flex cursor-pointer items-center justify-center rounded-full p-2 hover:scale-105"
                  >
                    <IoMdPause className="h-8 w-8 transform text-indigo-200" />
                  </button>
                ) : (
                  <button
                    onClick={handlePlay}
                    className="hover:tranform bottom-0 right-0 flex cursor-pointer rounded-full bg-indigo-200 p-2 hover:scale-105"
                  >
                    <RiPlayFill className="h-8 w-8  transform text-indigo-900" />
                  </button>
                )}
                {audiodata.isFetched ? (
                  <audio ref={audioRef} controls hidden>
                    <source ref={sourceRef} src="" type="audio/mp3" />
                  </audio>
                ) : null}
              </div>
            </div>
          </div>

          <div className={news ? "w-5/6" : "hidden"}>
            <iframe
              ref={spotifySong}
              className="border-radius:12px"
              src="https://open.spotify.com/embed/track/1VNvsvEsUpuUCbHpVop1vo?utm_source=generator"
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
