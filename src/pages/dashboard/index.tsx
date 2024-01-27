import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { api } from "~/utils/api";
import Link from "next/link";
import SpotifyPlayer from "./spotifyPlayer";
import NewsPlayer from "./newsPlayer";
import type { Transition, News } from "~/utils/GPT/GPT";

export default function Home() {
  const { status } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (status === "unauthenticated") {
      void router.replace("/");
    }
  }, [status, router]);

  const [musicPlaying, setMusicPlaying] = useState(false);
  const [music, setMusic] = useState<string[] | undefined>(undefined);
  const [lastSong, setLastSong] = useState(true);
  const [news, setNews] = useState<News | undefined>(undefined);
  const [transition, setTransition] = useState<Transition | undefined>(
    undefined,
  );

  const mixer = api.mixer.mixer.useMutation();

  useEffect(() => {
    if (
      mixer.data === undefined &&
      mixer.isLoading === false &&
      (mixer !== null || undefined)
    ) {
      mixer.mutate();
    }
    if (mixer.data !== undefined) {
      if (mixer.data.musicIds !== undefined) {
        console.log(mixer.data.musicIds);
        setMusic(mixer.data.musicIds);
        setMusicPlaying(true);
        setLastSong(false);
      } else if (mixer.data.newsSegment !== undefined) {
        setNews(mixer.data.newsSegment.content as News);
      }
      setTransition(mixer.data.transitionSegment.content as Transition);
    }
  }, [mixer, mixer.data]);

  useEffect(() => {
    if (lastSong) {
      // mixer.mutate(mixer.data);
    }
  }, [lastSong]);

  // function askGPT() {
  //   console.log(gptData.data?.binaryString);
  // }

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
            onClick={async () => {
              await signOut({ callbackUrl: "/" });
            }}
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

        <div>
          {musicPlaying ? (
            <SpotifyPlayer musicIds={music} />
          ) : (
            <NewsPlayer transition={transition} news={news} />
          )}
        </div>
        <button
          onClick={() => setMusicPlaying(!musicPlaying)}
          className="m-2 mx-auto flex w-64 cursor-pointer items-center justify-center rounded-full bg-indigo-200 p-4 text-lg text-indigo-900 hover:bg-emerald-300"
        >
          toggle news/music player
        </button>
      </div>
    </main>
  );
}
