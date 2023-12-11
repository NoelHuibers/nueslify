// FavoritesSelectionPage.tsx
import React, { useState } from "react";
import Image from "next/image";

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
  };

  return (
    <main className="flex h-screen flex-col items-center justify-center bg-gradient-to-b from-zinc-900 to-indigo-950">
      <div
        className={
          "appName bg-gradient-to-r from-amber-500 to-emerald-500 bg-clip-text p-20 text-6xl font-black text-transparent"
        }
      >
        choose your favorite news genre
      </div>
      <div className="genres-container">
        {genresList.map((genre) => (
          <button
            key={genre.name}
            className={`genre-button ${
              selectedGenres.includes(genre.name) ? "selected" : ""
            }`}
            onClick={() => handleGenreClick(genre.name)}
          >
            <div className="relative h-48 w-48">
              <Image
                src={genre.image}
                alt={genre.name}
                layout="fill"
                objectFit="cover"
                className="rounded-lg"
              />
            </div>
            <p>{genre.name}</p>
          </button>
        ))}
      </div>
      <button
        onClick={handleSubmit}
        className="save-button cursor-pointer rounded-2xl bg-indigo-200 px-8 py-4 text-xl font-bold text-indigo-900 transition duration-300 hover:bg-emerald-300"
      >
        Save Favorites
      </button>

      <style jsx>{`
        .appName {
          font-family: "Pacifico", sans-serif, cursive;
          text-align: center;
        }

        .genres-container {
          font-family: "Pacifico", sans-serif, cursive;
          display: flex;
          flex-wrap: wrap;
          justify-content: center; /* Horizontal zentrieren */
          align-items: center; /* Vertikal zentrieren */
        }

        .genre-button {
          border: 4px solid #ccc;
          background-color: #ccc;
          border-radius: 8px;
          margin: 8px;
          padding: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .genre-button:hover {
          background-color: #fcba03;
          border-color: #fcba03;
        }

        .genre-button.selected {
          border-color: #fcba03;
          background-color: #fcba03;
        }

        .page-title {
          text-align: center;
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
