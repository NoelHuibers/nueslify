import { signOut } from "next-auth/react";
import Link from "next/link";

const Navbar = () => {
  return (
    <nav className="flex h-fit w-full flex-row items-center p-8">
      <h1 className="text-xl text-slate-50">Nueslify</h1>

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
  );
};

export default Navbar;
