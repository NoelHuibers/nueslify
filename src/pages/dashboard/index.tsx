import { useEffect, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { api } from "~/utils/api";
import { SlControlPlay } from "react-icons/sl";
import { SlControlPause } from "react-icons/sl";

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();

  const audioRef = useRef<HTMLAudioElement>(null);
  const sourceRef = useRef<HTMLSourceElement>(null);

  const audiodata = api.tts.ttsNew.useQuery();
  const audioPath = "";

  useEffect(() => {
    if (sourceRef.current && audiodata.data) {
      const arrayBuffer = new ArrayBuffer(audiodata.data.length);
      const uint8Array = new Uint8Array(arrayBuffer);
      for (let i = 0; i < audiodata.data.length; i++) {
        uint8Array[i] = audiodata.data.charCodeAt(i) & 0xff;
      }
      const blob = new Blob([arrayBuffer], { type: "audio/mp3" });
      const blobUrl = URL.createObjectURL(blob);
      sourceRef.current.src = blobUrl;
    }
  }, [sourceRef, audiodata]);

  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = async () => {
    setIsPlaying(true);
    if (audioRef.current) {
      await audioRef.current.play();
    }
  };

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
    <main className="h-screen w-screen bg-slate-50">
      <div className="flex h-full w-full flex-col">
        <nav className="flex h-fit w-full flex-row items-center p-8 ">
          <h1 className="text-lg">Dashboard</h1>
          <button
            className="mx-auto mr-1 rounded-xl bg-indigo-900 px-6 py-2 text-slate-50"
            onClick={() => void signOut()}
          >
            <p className="text-lg">Logout</p>
          </button>
        </nav>
        <div className="flex h-full w-full flex-col items-center justify-center">
          {isPlaying ? (
            <button
              onClick={handlePause}
              className="flex cursor-pointer items-center justify-center rounded-full bg-indigo-900 p-6 hover:bg-indigo-800"
            >
              <SlControlPause className="h-8 w-8 text-slate-50" />
            </button>
          ) : (
            <button
              onClick={handlePlay}
              className="flex cursor-pointer items-center justify-center rounded-full bg-indigo-900 p-6 hover:bg-indigo-800"
            >
              <SlControlPlay className="h-8 w-8 text-slate-50" />
            </button>
          )}
          <audio ref={audioRef} controls hidden>
            <source ref={sourceRef} src={audioPath} type="audio/mp3" />
          </audio>
        </div>
      </div>
    </main>
  );
}
