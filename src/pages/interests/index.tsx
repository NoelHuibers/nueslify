// FavoritesSelectionPage.tsx
import React, { useState } from "react";
import Image from "next/legacy/image";
import Link from "next/link";

interface Genre {
  name: string;
  image: string; // Use the path to the image in the public directory
}

const genresList: Genre[] = [
  { name: "technology", image: "/photos/technology.jpg" },
  { name: "science", image: "/photos/science.jpg" },
  { name: "business", image: "/photos/business.jpg" },
  { name: "entertainment", image: "/photos/entertainment.jpg" },
  { name: "health", image: "/photos/health.jpg" },
  { name: "sports", image: "/photos/sports.jpg" },
];

const FavoritesSelectionPage: React.FC = () => {
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [name, setName] = useState<string>(""); // Add state for the name
  const [age, setAge] = useState<number | undefined>(undefined); // Add state for the age
  const [newsMusicAmount, setNewsMusicAmount] = useState<number | undefined>(
    50,
  ); // Add state for the newAmount

  const isNameValid = (value: string): boolean => {
    const regex = /^[a-zA-Z\s-]+$/;
    return regex.test(value);
  };

  const isAgeValid = (value: number | undefined): boolean => {
    return (
      value !== undefined &&
      Number.isInteger(value) &&
      value >= 0 &&
      value <= 120
    );
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    if (isNameValid(newName)) {
      setName(newName);
    }
  };

  const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAge = parseInt(e.target.value, 10);
    if (isAgeValid(newAge)) {
      setAge(newAge);
    }
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLocation = e.target.value;
    setName(newLocation);
  };

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

  const handleSubmit = () => {
    // Process the selected genres
    console.log("Selected Genres:", selectedGenres);
    console.log("Name:", name);
    console.log("Age:", age);
    console.log("Music/News Amount:", newsMusicAmount);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-900 to-indigo-950">
      <div className="flex w-full items-center justify-center">
        <form className="mx-auto max-w-md">
          <div className="">
            <div className="">
              <h1 className="appFont font-semibold leading-7 text-white">
                Your Profile
              </h1>

              <div className="mt-5">
                <div className="">
                  <label
                    htmlFor="username"
                    className="block text-sm font-medium leading-6 text-white"
                  >
                    Username
                  </label>
                  <div className="">
                    <div className="flex rounded-md  ring-1 ring-inset ring-white focus-within:ring-2 focus-within:ring-inset focus-within:ring-emerald-300 sm:max-w-md">
                      <input
                        type="text"
                        name="username"
                        id="username"
                        autoComplete="username"
                        className="block flex-1 border-0 bg-transparent py-1.5 pl-1 text-white placeholder:text-white/40 focus:ring-0 sm:text-sm sm:leading-6"
                        placeholder="nueslify-user123"
                        onChange={handleNameChange}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <div className="">
                  <label
                    htmlFor="age"
                    className="block text-sm font-medium leading-6 text-white"
                  >
                    Age
                  </label>
                  <div className="">
                    <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-white focus-within:ring-2 focus-within:ring-inset focus-within:ring-emerald-300 sm:max-w-md">
                      <input
                        type="number"
                        name="age"
                        id="age"
                        autoComplete="age"
                        className="block flex-1 border-0 bg-transparent py-1.5 pl-1 text-white placeholder:text-white/40 focus:ring-0 sm:text-sm sm:leading-6"
                        placeholder="25"
                        value={age ?? ""}
                        onChange={handleAgeChange}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <div className="">
                  <label
                    htmlFor="location"
                    className="block text-sm font-medium leading-6 text-white"
                  >
                    Location
                  </label>
                  <div className="">
                    <div className="flex rounded-md  ring-1 ring-inset ring-white focus-within:ring-2 focus-within:ring-inset focus-within:ring-emerald-300 sm:max-w-md">
                      <input
                        type="text"
                        name="location"
                        id="location"
                        autoComplete="location"
                        className="block flex-1 border-0 bg-transparent py-1.5 pl-1 text-white placeholder:text-white/40 focus:ring-0 sm:text-sm sm:leading-6"
                        placeholder="Germany"
                        onChange={handleLocationChange}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <div className="">
                  <label
                    htmlFor="musicNewsAmount"
                    className="block text-sm font-medium leading-6 text-white"
                  >
                    Select how much music/news you want to listen to
                  </label>
                  <div className="range-input text-white">
                    <span className="appFont">music</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={newsMusicAmount}
                      onChange={(e) =>
                        setNewsMusicAmount(parseInt(e.target.value, 10))
                      }
                      className="w-full"
                    />
                    <span className="appFont">news</span>
                  </div>
                </div>
              </div>

              <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                <div className="sm:col-span-4">
                  <label
                    htmlFor="musicNewsAmount"
                    className="block text-sm font-medium leading-6 text-white"
                  >
                    Select your favorite news genres
                  </label>
                </div>
              </div>
              <div className="genres-container max-w-3xl">
                {genresList.map((genre) => (
                  <button
                    key={genre.name}
                    className={`genre-button ${
                      selectedGenres.includes(genre.name) ? "selected" : ""
                    }`}
                    onClick={() => handleGenreClick(genre.name)}
                  >
                    <div className="relative h-32 w-32">
                      <Image
                        src={genre.image}
                        alt={genre.name}
                        layout="fill"
                        objectFit="cover"
                        className="rounded"
                      />
                    </div>
                    <p>{genre.name}</p>
                  </button>
                ))}
              </div>
              <div className="mb-2 mt-6 flex items-center justify-center gap-x-6">
                <Link
                  href="../dashboard"
                  className="transition-duration-1000 text-xl font-bold leading-6 text-white"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  onClick={handleSubmit}
                  className="transition-duration-600 rounded-md bg-indigo-200 px-3 py-2 text-sm text-xl font-bold text-indigo-900 hover:bg-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                  Save
                </button>
              </div>
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

        .range-input {
          display: flex;
          align-items: center;
        }

        .range-input span {
          margin: 0 8px;
        }

        .appFont {
          font-family: "Pacifico", sans-serif, cursive;
          font-color: #ffffff;
        }

        .genres-container {
          font-family: "Pacifico", sans-serif, cursive;
          display: flex;
          flex-wrap: wrap;
          justify-content: center; /* Horizontal zentrieren */
          align-items: center; /* Vertikal zentrieren */
        }

        .genre-button {
          background-color: #ccc;
          border-radius: 6px;
          margin: 4px;
          padding: 4px;
          display: flex;
          flex-direction: column;
        }

        .genre-button:hover {
          background-color: #fcba03;
          border-color: #fcba03;
        }

        .genre-button.selected {
          border-color: #fcba03;
          background-color: #fcba03;
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
          display: block; /* Verhindert, dass der Button die volle Breite einnimmt */
        }
      `}</style>
    </main>
  );
};

export default FavoritesSelectionPage;
