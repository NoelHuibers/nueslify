import { signIn, useSession } from "next-auth/react";
import styles from "./index.module.css";
import { useRouter } from "next/router";
import { useEffect } from "react";

export default function Home() {
  const { status } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (status === "authenticated") {
      void router.replace("/dashboard");
    }
  }, [status, router]);

  if (status === "authenticated" || status === "loading") {
    return null;
  }
  return (
    <main className="flex h-screen w-screen flex-col items-center justify-center bg-gradient-to-b from-zinc-900 to-indigo-950">
      <div className={styles.appName}>Nueslify</div>
      <div className="flex flex-row space-x-8">
        <button
          onClick={async () => {
            await signIn("spotify", { callbackUrl: "/dashboard" });
          }}
          className="cursor-pointer rounded-2xl bg-indigo-200 px-8 py-4 text-xl font-bold text-indigo-900 transition duration-300 hover:bg-amber-300"
        >
          Sign Up
        </button>
        <button
          onClick={async () => {
            await signIn("spotify", { callbackUrl: "/dashboard" });
          }}
          className="cursor-pointer rounded-2xl bg-indigo-200 px-8 py-4 text-xl font-bold text-indigo-900 transition duration-300 hover:bg-emerald-300"
        >
          Log In
        </button>
      </div>
    </main>
  );
}
