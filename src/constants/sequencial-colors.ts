// Soft, muted palette for the composition bar, most frequent bean first. Kept
// low in saturation so the bar reads as data without dominating the row.
// Light values are used as-is; dark mode uses deeper tones of the same hues
// (defined as CSS variables in index.css), so the bar does not glare on the
// dark background.
export const SEQUENCIAL_COLORS = [
    "#8FBFAE", // sage
    "#E2C79A", // sand
    "#A9B8D9", // soft blue
    "#D9A7A0", // rose
    "#BFA9D4", // lavender
    "#B5C99A", // olive
    "#9CC7D1", // mist
];

export const SEQUENCIAL_COLORS_DARK = [
    "#4F8C7A", // sage
    "#A88A55", // sand
    "#6377A3", // soft blue
    "#A3665E", // rose
    "#7E6A9C", // lavender
    "#76895A", // olive
    "#5A8F9B", // mist
];

/** Theme-aware color for the index-th segment (`--composition-<n>` in index.css). */
export const compositionColor = (index: number) =>
    `var(--composition-${(index % SEQUENCIAL_COLORS.length) + 1})`;
