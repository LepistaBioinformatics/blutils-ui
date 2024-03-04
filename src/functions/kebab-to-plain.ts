export function kebabToPlain(value: string): string {
    return value
        .replace(/-/g, " ")
        .split(" ")
        .map((word) => word[0].toUpperCase() + word.slice(1))
        .join(" ");
}
