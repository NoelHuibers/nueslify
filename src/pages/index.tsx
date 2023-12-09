import { signIn, useSession } from "next-auth/react";

import styles from "./index.module.css";
import { useRouter } from "next/router";
import Link from "next/link";

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();
  if (session) {
    void router.replace("/dashboard");
    return null;
  }

  return (
    <main className="flex h-screen flex-col items-center justify-center bg-gradient-to-b from-zinc-900 to-indigo-950">
      <div className={styles.appName}>Nueslify</div>
      <div className="flex flex-row space-x-8">
        <Link
          href="/rondell"
          className="cursor-pointer rounded-2xl bg-indigo-200 px-8 py-4 text-xl font-bold text-indigo-900 transition duration-300 hover:bg-amber-300"
        >
          Sign Up
        </Link>
        <button
          onClick={() => void signIn()}
          className="cursor-pointer rounded-2xl bg-indigo-200 px-8 py-4 text-xl font-bold text-indigo-900 transition duration-300 hover:bg-emerald-300"
        >
          Log In
        </button>
      </div>
    </main>
  );
}
