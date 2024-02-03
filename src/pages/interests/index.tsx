import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { type ZodType, z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
//import CountrySelect from "./countries";
import StateSelect from "./bundeslaender";
import { api } from "~/utils/api";
import { useRouter } from "next/router";

type FormData = {
  //name: string;
  age: number;
  //country: string;
  state: string;
  musicNewsAmount: number;
  ai: string;
  hostStyle: string;
  musicTerm: string;
  categories: string[];
};

interface Genre {
  name: string;
  image: string; // Use the path to the image in the public directory
}

const genresList: Genre[] = [
  { name: "Inland", image: "/photos/inland.jpg" },
  { name: "Ausland", image: "/photos/ausland.jpg" },
  { name: "Wirtschaft", image: "/photos/business.jpg" },
  { name: "Sport", image: "/photos/sports.jpg" },
  { name: "Investigativ", image: "/photos/investigativ.jpg" },
  { name: "Faktenfinder", image: "/photos/faktenfinder.jpg" },
];

const genreTranslations: Record<string, string> = {
  Inland: "Domestic",
  Ausland: "Foreign",
  Wirtschaft: "Economy",
  Sport: "Sports",
  Investigativ: "Investigative",
  Faktenfinder: "Fact Finder",
};

const gptStyleOptions = ["Default", "Slack", "Professional"];
const musicTermOptions = [
  "Your Current Music Favorities",
  "Your Recent Music Favorites",
  "All-Time Music Favorites",
];
const aiOptions = ["OpenAI", "Google Gemini"];

export default function Home() {
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  const saveData = api.interests.interests.useMutation();
  const router = useRouter();

  const handleGenreClick = (genre: string) => {
    setSelectedGenres((prevGenres) => {
      if (prevGenres.includes(genre)) {
        // Genre is already selected, remove it
        return prevGenres.filter((selectedGenre) => selectedGenre !== genre);
      } else {
        // Genre is not selected, add it
        return [...prevGenres, genre];
      }
    });
  };

  const schema: ZodType<FormData> = z.object({
    //name: z.string().min(2, "Name must be at least 2 characters"),
    age: z
      .number()
      .min(18, "You must be at least 18 years old")
      .max(100, "You must be at most 100 years old"),
    //country: z.string().min(1, "Please select a country"),
    state: z.string().min(1, "Please select a state"),
    musicNewsAmount: z.number(),
    ai: z.string(),
    hostStyle: z.string(),
    musicTerm: z.string(),
    categories: z.array(z.string()),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const submitData = async (data: FormData) => {
    try {
      console.log("it worked", data);
      await saveData.mutateAsync({
        age: data.age,
        state: data.state,
        musicNewsAmount: data.musicNewsAmount,
        ai: data.ai,
        hostStyle: data.hostStyle,
        musicTerm: data.musicTerm,
      });

      // Redirect to the dashboard page on success
      await router.push("../dashboard");
    } catch (error) {
      console.error("Fehler beim Speichern der Daten:", error);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-900 to-indigo-950">
      <div className="m-1 flex w-full items-center justify-center">
        <form className="mx-auto max-w-md" onSubmit={handleSubmit(submitData)}>
          <div className="">
            <div className="">
              <h1 className="appFont mt-2 text-3xl font-semibold leading-7 text-white">
                Profile
              </h1>

              {/*
              <div className="mt-2">
                <div className="">
                  <label
                    htmlFor="username"
                    className="flex items-center text-sm font-medium leading-6 text-white"
                  >
                    Username
                    {errors.name && (
                      <span className="ml-auto flex items-center text-xs text-red-500">
                        {errors.name.message}
                      </span>
                    )}
                  </label>
                  <div className="">
                    <div className="flex rounded-md  ring-1 ring-inset ring-white focus-within:ring-2 focus-within:ring-inset focus-within:ring-emerald-300 sm:max-w-md">
                      <input
                        type="text"
                        {...register("name")}
                        className="block flex-1 border-0 bg-transparent py-1.5 pl-1 text-white placeholder:text-white/40 focus:ring-0 sm:text-sm sm:leading-6"
                        placeholder="nueslify-user123"
                      />
                    </div>
                  </div>
                </div>
              </div>
              */}

              <div className="mt-5">
                <div className="">
                  <label
                    htmlFor="age"
                    className="flex items-center text-sm font-medium leading-6 text-white"
                  >
                    Age
                    {errors.age && (
                      <span className="ml-auto flex items-center text-xs text-red-500">
                        {errors.age.message}
                      </span>
                    )}
                  </label>
                  <div className="">
                    <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-white focus-within:ring-2 focus-within:ring-inset focus-within:ring-emerald-300 sm:max-w-md">
                      <input
                        type="number"
                        {...register("age", { valueAsNumber: true })}
                        className="flex-1 border-0 bg-transparent py-1.5 pl-1 text-white placeholder:text-white/40 focus:ring-0 sm:text-sm sm:leading-6"
                        placeholder="25"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/*
              <div className="mt-5">
                <div className="">
                  <label
                    htmlFor="country"
                    className="flex items-center text-sm font-medium leading-6 text-white"
                  >
                    Country
                    {errors.country && (
                      <span className="ml-auto flex items-center text-xs text-red-500">
                        {errors.country.message}
                      </span>
                    )}
                  </label>
                  <div className="">
                    <div className="flex rounded-md  ring-1 ring-inset ring-white focus-within:ring-2 focus-within:ring-inset focus-within:ring-emerald-300 sm:max-w-md">
                      <select
                        id="countryDropdown"
                        {...register("country")}
                        className=" dropdown block flex-1 border-0 bg-transparent py-1.5 pl-1 text-white placeholder:text-white/40 focus:ring-0 sm:text-sm sm:leading-6"
                      >
                        <CountrySelect />
                      </select>
                    </div>
                  </div>
                </div>
              </div>
                    */}

              <div className="mt-5">
                <div className="">
                  <label
                    htmlFor="state"
                    className="flex items-center text-sm font-medium leading-6 text-white"
                  >
                    State
                    {errors.state && (
                      <span className="ml-auto flex items-center text-xs text-red-500">
                        {errors.state.message}
                      </span>
                    )}
                  </label>
                  <div className="">
                    <div className="flex rounded-md  ring-1 ring-inset ring-white focus-within:ring-2 focus-within:ring-inset focus-within:ring-emerald-300 sm:max-w-md">
                      <select
                        id="stateDropdown"
                        {...register("state")}
                        className=" dropdown block flex-1 border-0 bg-transparent py-1.5 pl-1 text-white placeholder:text-white/40 focus:ring-0 sm:text-sm sm:leading-6"
                      >
                        <StateSelect />
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-10">
                <h1 className="appFont mt-2 text-3xl font-semibold leading-7 text-white">
                  Balance
                </h1>
                <div className="mt-2">
                  <label
                    htmlFor="musicNewsAmount"
                    className="block text-sm font-medium leading-6 text-white"
                  >
                    Select how much music/news you want to listen to
                  </label>
                  <div className="range-input ml-4 mr-4 text-white">
                    <span className="appFont">music</span>
                    <input
                      type="range"
                      {...register("musicNewsAmount", { valueAsNumber: true })}
                      min="0"
                      max="100"
                      className="slider w-full"
                    />
                    <span className="appFont">news</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10">
              <h1 className="appFont mt-2 text-3xl font-semibold leading-7 text-white">
                AI
              </h1>
              <div className="mt-2">
                <label
                  htmlFor="ai"
                  className="block text-sm font-medium leading-6 text-white"
                >
                  Select your preffered AI
                </label>
                <div className="">
                  <div className="flex rounded-md  ring-1 ring-inset ring-white focus-within:ring-2 focus-within:ring-inset focus-within:ring-emerald-300 sm:max-w-md">
                    <select
                      id="aiDropdown"
                      {...register("ai")}
                      className=" dropdown block flex-1 border-0 bg-transparent py-1.5 pl-1 text-white placeholder:text-white/40 focus:ring-0 sm:text-sm sm:leading-6"
                    >
                      {aiOptions.map((options) => (
                        <option key={options} value={options}>
                          {options}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10">
              <h1 className="appFont mt-2 text-3xl font-semibold leading-7 text-white">
                Host
              </h1>
              <div className="mt-2">
                <label
                  htmlFor="host"
                  className="block text-sm font-medium leading-6 text-white"
                >
                  Select your radio host style
                </label>
                <div className="">
                  <div className="flex rounded-md  ring-1 ring-inset ring-white focus-within:ring-2 focus-within:ring-inset focus-within:ring-emerald-300 sm:max-w-md">
                    <select
                      id="styleDropdown"
                      {...register("hostStyle")}
                      className=" dropdown block flex-1 border-0 bg-transparent py-1.5 pl-1 text-white placeholder:text-white/40 focus:ring-0 sm:text-sm sm:leading-6"
                    >
                      {gptStyleOptions.map((options) => (
                        <option key={options} value={options}>
                          {options}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10">
              <h1 className="appFont mt-2 text-3xl font-semibold leading-7 text-white">
                Music
              </h1>
              <div className="mt-2">
                <label
                  htmlFor="musicTerm"
                  className="block text-sm font-medium leading-6 text-white"
                >
                  Select which favourites you want to listen to
                </label>
                <div className="">
                  <div className="flex rounded-md  ring-1 ring-inset ring-white focus-within:ring-2 focus-within:ring-inset focus-within:ring-emerald-300 sm:max-w-md">
                    <select
                      id="musicTermDropdown"
                      {...register("musicTerm")}
                      className=" dropdown block flex-1 border-0 bg-transparent py-1.5 pl-1 text-white placeholder:text-white/40 focus:ring-0 sm:text-sm sm:leading-6"
                    >
                      {musicTermOptions.map((options) => (
                        <option key={options} value={options}>
                          {options}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <h1 className="appFont mt-10 text-3xl font-semibold leading-7 text-white">
              Taste
            </h1>
            <div className="mt-2 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
              <div className="sm:col-span-4">
                <label
                  htmlFor="musicNewsAmount"
                  className="block text-sm font-medium leading-6 text-white"
                >
                  Select your favorite news genres
                </label>
              </div>
            </div>
            <div className="genres-container">
              {genresList.map((genre) => (
                <div
                  key={genre.name}
                  className={`genre-button bg-indigo-200 ${
                    selectedGenres.includes(genre.name) ? "selected" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    id={genre.name}
                    {...register("categories", { required: true })}
                    value={genre.name}
                    checked={selectedGenres.includes(genre.name)}
                    onChange={() => handleGenreClick(genre.name)}
                    style={{
                      position: "absolute",
                      opacity: 0,
                      pointerEvents: "none",
                    }}
                  />
                  <label htmlFor={genre.name}>
                    <div className="relative h-32 w-32 bg-indigo-200">
                      <Image
                        src={genre.image}
                        alt={genreTranslations[genre.name] ?? genre.name} // Use translation or default to German if not found
                        layout="fill"
                        objectFit="cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 750px) 50vw, 33.3vw"
                        className="rounded"
                      />
                      {selectedGenres.includes(genre.name) && (
                        <div className="indicator">
                          <div className="checkmark">
                            <div className="checkmark_stem"></div>
                            <div className="checkmark_kick"></div>
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="font-bold text-indigo-900">
                      {genreTranslations[genre.name] ?? genre.name}
                    </p>
                  </label>
                </div>
              ))}
            </div>

            <div className="mb-2 mt-6 flex items-center justify-center gap-x-6">
              <Link
                href="../dashboard"
                className="transition-duration-1000 text-xl font-bold leading-6 text-white"
              >
                Back
              </Link>
              <button
                type="submit"
                className="rounded-md bg-indigo-200 px-3 py-2 text-xl font-bold text-indigo-900 hover:bg-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Save
              </button>
            </div>
          </div>
        </form>
      </div>

      <style jsx>{`
        .label-text {
          font-family: "Pacifico", sans-serif, cursive;
          margin-right: 8px;
        }

        .form-input {
          border: 1px solid #ccc;
          border-radius: 4px;
          padding: 8px;
          width: 300px;
        }

        .dropdown {
          color: white;
          padding: 8px;
          border: none;
          border-radius: 4px;
        }

        .dropdown option {
          background-color: #10b981;
          color: white;
        }

        /* Style the scrollbar for WebKit browsers (Chrome, Safari) */
        .dropdown::-webkit-scrollbar {
          width: 12px;
        }

        .dropdown::-webkit-scrollbar-thumb {
          background-color: #10b981;
          border: 3px solid white;
        }

        .dropdown::-webkit-scrollbar-track {
          background-color: white;
        }

        /* Style the scrollbar for Firefox */
        .dropdown {
          scrollbar-color: #10b981 white;
        }

        /* Style the scrollbar for Edge and IE */
        .dropdown {
          -ms-overflow-style: none;
        }

        .dropdown::-ms-scrollbar-thumb {
          background-color: #10b981;
          border: 3px solid white;
        }

        .dropdown::-ms-scrollbar-track {
          background-color: white;
        }

        .dropdown:hover::-ms-scrollbar-thumb {
          background-color: #10b981;
          border: 3px solid white;
        }

        .range-input {
          display: flex;
          align-items: center;
        }

        .range-input span {
          margin: 0 8px;
        }

        .slider {
          -webkit-appearance: none;
          width: 100%;
          height: 7px;
          border-radius: 5px;
          background: #d3d3d3;
          outline: none;
          opacity: 0.8;
          transition: opacity 0.2s;
        }

        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #10b981; /* Change this to the desired color (emerald-300) */
          cursor: pointer;
        }

        .slider:hover {
          opacity: 1;
        }

        .appFont {
          font-family: "Pacifico", sans-serif, cursive;
          font-color: #ffffff;
        }

        .genres-container {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          align-items: center;
        }

        .genre-button {
          border-radius: 6px;
          margin: 6px;
          padding: 4px;
          display: flex;
          flex-direction: column;
          transition: transform 0.2s;
        }

        .genre-button:hover {
          background-color: #10b981;
          border-color: #10b981;
          transform: scale(1.02);
        }

        .genre-button.selected {
          border-color: #10b981;
          background-color: #10b981;
          transform: scale(1);
        }

        .indicator {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-color: #10b981;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .checkmark {
          display: inline-block;
          transform: rotate(45deg);
        }

        .checkmark_stem {
          position: absolute;
          width: 3px;
          height: 17px;
          background-color: #ffffff;
          top: -10px;
        }

        .checkmark_kick {
          position: absolute;
          width: 9px;
          height: 3px;
          background-color: #ffffff;
          left: -6px;
          top: 5px;
        }

        .text-left {
          text-align: left;
        }

        .save-button {
          margin: 16px auto;
          padding: 8px 16px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          display: block;
        }
      `}</style>
    </main>
  );
}
