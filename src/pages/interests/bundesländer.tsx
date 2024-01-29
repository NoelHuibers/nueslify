const bundeslaenderList: string[] = [
  "Baden-Württemberg",
  "Bayern",
  "Berlin",
  "Brandenburg",
  "Bremen",
  "Hamburg",
  "Hessen",
  "Mecklenburg-Vorpommern",
  "Niedersachsen",
  "Nordrhein-Westfalen",
  "Rheinland-Pfalz",
  "Saarland",
  "Sachsen",
  "Sachsen-Anhalt",
  "Schleswig-Holstein",
  "Thüringen",
];

const BundeslandSelect = () => {
  return (
    <>
      <option value="" className="bg-[#10b981] text-white">
        Choose your state
      </option>
      {bundeslaenderList.map((bundesland) => (
        <option
          key={bundesland}
          value={bundesland}
          className="bg-[#10b981] text-white"
        >
          {bundesland}
        </option>
      ))}
    </>
  );
};

export default BundeslandSelect;
