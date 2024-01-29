import { signOut } from "next-auth/react";
import Link from "next/link";
import { IoIosSettings } from "react-icons/io";
import { IoLogOut } from "react-icons/io5";

const Navbar = () => {
  return (
    <nav className="flex h-fit w-full items-center justify-between p-8">
      <h1 className="text-xl text-slate-50">Dashboard</h1>

      <div className="flex">
        <Link
          href="/interests"
          className="duration-30 mr-1 rounded-xl bg-indigo-200 px-2 py-2 text-xl font-bold text-indigo-900 transition hover:bg-emerald-300"
        >
          <IoIosSettings size={50} />
        </Link>
        <button
          className="duration-30 rounded-xl bg-indigo-200 py-2 pl-3 pr-1 text-xl font-bold text-indigo-900 transition hover:bg-emerald-300"
          onClick={async () => {
            await signOut({ callbackUrl: "/" });
          }}
        >
          <IoLogOut size={50} />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
