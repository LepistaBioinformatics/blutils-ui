import { kebabToPlain } from "../../../../functions/kebab-to-plain";

interface Props {
  taxonomy: string;
}

export function TaxonomyCell({ taxonomy }: Props) {
  return (
    <div className="flex">
      {taxonomy.split(";").map((bit, index) => {
        const splittted = bit.split("__");

        if (splittted.length === 2) {
          return (
            <div
              key={index}
              className="mr-2 pl-2 flex flex-col border-l border-l-gray-400"
            >
              <span>{kebabToPlain(splittted.at(1) as string)}</span>
              <span className="text-gray-400 mr-2 uppercase text-xs">
                {translateRank(splittted.at(0) as string)}
              </span>
            </div>
          );
        }

        return <span key={index}>{bit}</span>;
      })}
    </div>
  );
}

function translateRank(rank: string) {
  switch (rank) {
    case "superkingdom":
      return "kingdom";
    case "d":
      return "domain";
    case "p":
      return "phylum";
    case "c":
      return "class";
    case "o":
      return "order";
    case "f":
      return "family";
    case "g":
      return "genus";
    case "s":
      return "species";
    default:
      return rank;
  }
}
