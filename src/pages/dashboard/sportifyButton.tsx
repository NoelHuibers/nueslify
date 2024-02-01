import { FaSpotify } from "react-icons/fa";

const openSpotify = (): void => {
  window.open("https://www.spotify.com", "_blank", "noopener,noreferrer");
};

const SpotifyButton = () => {
  return (
    <div className="mt-3 flex justify-center">
      <button
        className="duration-30 flex items-center justify-center rounded-xl bg-indigo-200 p-4 text-xl font-bold text-indigo-900 transition hover:bg-emerald-300"
        onClick={openSpotify}
      >
        <div className="flex items-center space-x-2">
          <FaSpotify size={40} />
          <span>Open on Spotify</span>
        </div>
      </button>
    </div>
  );
};

export default SpotifyButton;
