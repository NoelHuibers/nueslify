import React, { useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/router";

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!session) {
      void router.replace("/");
    }
  }, [session, router]);

  if (!session) {
    return null;
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <button onClick={() => void signOut()}>Logout</button>
    </div>
  );
}
