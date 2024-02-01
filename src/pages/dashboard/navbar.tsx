import { signOut } from "next-auth/react";
import Link from "next/link";
import { IoIosSettings } from "react-icons/io";
import { IoLogOut } from "react-icons/io5";

const Navbar = () => {
  return (
    <nav className="flex h-fit w-full items-center justify-between px-2 py-2 md:px-8 md:py-4">
      <h1 className="text-2xl text-slate-50">Nueslify</h1>
      <div className="flex space-x-2">
        <Link
          href="/interests"
          className="duration-30 rounded-lg bg-indigo-200 px-1 py-1 text-xl font-bold text-indigo-900 transition hover:bg-emerald-300"
        >
          <IoIosSettings size={48} />
        </Link>
        <button
          className="duration-30 rounded-lg bg-indigo-200 py-1 pl-1.5 pr-0.5 text-xl font-bold text-indigo-900 transition hover:bg-emerald-300"
          onClick={async () => {
            await signOut({ callbackUrl: "/" });
          }}
        >
          <IoLogOut size={48} />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
