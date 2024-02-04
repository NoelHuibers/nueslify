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
  isPaused: boolean;
}) => {
  const handlePause = () => {
    props.togglePlay();
  };

  return (
    <>
      <div className="flex items-center justify-center">
        <div className="p-2">
          <div className="flex w-min flex-col justify-center space-y-4 rounded-lg bg-slate-50 bg-opacity-10 p-8 align-middle shadow drop-shadow-2xl backdrop-blur-md">
            {props.image ? (
              <div className="h-60 w-60 md:h-80 md:w-80">{props.image}</div>
            ) : (
              <Skeleton className="h-60 w-60 md:h-80 md:w-80" />
            )}
            <div className="space-y-1 overflow-hidden whitespace-nowrap">
              {props.trackname ? (
                <div className="w-60 select-none truncate text-xl font-bold tracking-tight text-slate-50 md:w-80 md:text-2xl">
                  {props.trackname}
                </div>
              ) : (
                <Skeleton className="w-30 h-6 md:h-8 md:w-40" />
              )}
              {props.trackname ? (
                <div className="w-60 select-none truncate text-xl font-bold tracking-tight text-slate-50 md:w-80 md:text-2xl">
                  {props.artistname}
                </div>
              ) : (
                <Skeleton className="h-6 w-24 md:h-8 md:w-32" />
              )}
            </div>
            <div className="flex items-center justify-center space-x-6 p-4 text-slate-50">
              <button onClick={props.previousTrack}>
                <BsFillSkipBackwardFill className="h-12 w-12 md:h-16 md:w-16" />
              </button>
              <button onClick={handlePause}>
                {props.isPaused ? (
                  <FaPlay className="h-8 w-8 md:h-12 md:w-12" />
                ) : (
                  <FaPause className="h-8 w-8 md:h-12 md:w-12" />
                )}
              </button>
              <button onClick={props.nextTrack}>
                <BsFillSkipForwardFill className="h-12 w-12 md:h-16 md:w-16" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Player;
