import { kebabToPlain } from "./kebab-to-plain";

export function kebabToSciname(
  value: string,
  rank: "species" | "genus" | string
) {
  if (["species", "genus"].includes(rank)) {
    return (
      <span className="italic">
        {value
          .replace(/-/g, " ")
          .split(" ")
          .map((word, index) => {
            if (index === 0) {
              return word[0].toUpperCase() + word.slice(1);
            }

            return word;
          })
          .join(" ")}
      </span>
    );
  }

  return <span>{kebabToPlain(value)}</span>;
}

export function kebabToScinameString(
  value: string,
  rank: "species" | "genus" | string
) {
  if (["species", "genus"].includes(rank)) {
    return value
      .replace(/-/g, " ")
      .split(" ")
      .map((word, index) => {
        if (index === 0) {
          return word[0].toUpperCase() + word.slice(1);
        }

        return word;
      })
      .join(" ");
  }

  return kebabToPlain(value);
}
