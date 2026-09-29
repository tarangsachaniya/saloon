/**
 * Playful design language: plum outlines, hard offset shadows that "press in"
 * on hover, chunky rounded type. Every coloured fill carries plum text (AA).
 */

type Tone = "plum" | "butter" | "white" | "tomato" | "lilac" | "mint";

const FILL: Record<Tone, string> = {
  plum: "bg-plum text-butter",
  butter: "bg-butter text-plum",
  white: "bg-white text-plum",
  tomato: "bg-tomato text-plum",
  lilac: "bg-lilac text-plum",
  mint: "bg-mint text-plum",
};

export function popButton(tone: Tone = "plum", size: "md" | "lg" = "lg") {
  return [
    "inline-flex items-center justify-center gap-2 rounded-full border-2 border-plum font-bold",
    "transition-all duration-150 active:translate-x-1 active:translate-y-1 active:shadow-none",
    "hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[2px_2px_0_0_#3b1a3f]",
    "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-plum",
    size === "lg"
      ? "min-h-14 px-8 text-base shadow-[5px_5px_0_0_#3b1a3f]"
      : "min-h-11 px-5 text-sm shadow-[3px_3px_0_0_#3b1a3f]",
    FILL[tone],
  ].join(" ");
}

/** Bordered "sticker" card with a hard shadow. */
export const popCard =
  "rounded-[2rem] border-[3px] border-plum shadow-[6px_6px_0_0_#3b1a3f]";

export const PALETTE = ["bg-lilac", "bg-mint", "bg-butter", "bg-tomato"] as const;
