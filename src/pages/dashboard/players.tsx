import { useState } from "react";
import { FaPause } from "react-icons/fa";
import { FaPlay } from "react-icons/fa";
import { BsFillSkipBackwardFill } from "react-icons/bs";
import { BsFillSkipForwardFill } from "react-icons/bs";

const Player = (props: {
  image: React.JSX.Element;
  trackname: string;
  artistname: string;
  previousTrack: () => void;
  togglePlay: () => void;
  nextTrack: () => void;
}) => {
  const [is_paused, setIsPaused] = useState(false);
  const handlePause = () => {
    props.togglePlay();
    setIsPaused(!is_paused);
  };

  return (
    <>
      <div className="left-0 top-0 flex w-screen items-center justify-center">
        <div className="flex w-max flex-col justify-center space-y-4 rounded-lg bg-slate-50 bg-opacity-10 p-8 align-middle shadow drop-shadow-2xl backdrop-blur-md">
          <div className="h-80 w-80">{props.image}</div>
          <div className="overflow-hidden whitespace-nowrap">
            <div className="select-none truncate text-2xl font-bold tracking-tight text-slate-50">
              {props.trackname}
            </div>
            <div className="select-none truncate text-xl font-bold tracking-tight text-slate-50">
              {props.artistname}
            </div>
          </div>
          <div className="flex items-center justify-center space-x-6 p-4 text-slate-50">
            <button onClick={props.previousTrack}>
              <BsFillSkipBackwardFill size={64} />
            </button>
            <button onClick={handlePause}>
              {is_paused ? <FaPlay size={48} /> : <FaPause size={48} />}
            </button>
            <button onClick={props.nextTrack}>
              <BsFillSkipForwardFill size={64} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Player;
