import { useState } from "react";
import { FaPause } from "react-icons/fa";
import { FaPlay } from "react-icons/fa";
import { BsFillSkipBackwardFill } from "react-icons/bs";
import { BsFillSkipForwardFill } from "react-icons/bs";
import { Skeleton } from "~/components/ui/skeleton";

const Player = (props: {
  image: React.JSX.Element | null;
  trackname: string | null;
  artistname: string | null;
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
      <div className="flex h-full w-full items-center justify-center">
        <div className="p-8">
          <div className="flex w-max flex-col justify-center space-y-4 rounded-lg bg-slate-50 bg-opacity-10 p-8 align-middle shadow drop-shadow-2xl backdrop-blur-md">
            {props.image ? (
              <div className="h-80 w-80">{props.image}</div>
            ) : (
              <Skeleton className="h-80 w-80" />
            )}
            <div className="space-y-1 overflow-hidden whitespace-nowrap">
              {props.trackname ? (
                <div className="select-none truncate text-2xl font-bold tracking-tight text-slate-50">
                  {props.trackname}
                </div>
              ) : (
                <Skeleton className="h-8 w-40" />
              )}
              {props.trackname ? (
                <div className="select-none truncate text-2xl font-bold tracking-tight text-slate-50">
                  {props.artistname}
                </div>
              ) : (
                <Skeleton className="h-8 w-32" />
              )}
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
      </div>
    </>
  );
};

export default Player;
