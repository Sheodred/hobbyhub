interface ManaTextProps {
  text: string;
  className?: string;
}

// Scryfall syntax ({R}, {2}, {W/U}, {T}) rendered as Scryfall's own symbol
// SVGs, which are free to hotlink like the card images already are. The
// filename is the token without braces or slashes: {W/U} -> WU.svg.
// Anything that isn't a known symbol still resolves to a broken image, so
// the raw token stays in alt= and shows in its place.
// A mana symbol is an <img>, so its alt text is the entire experience for a
// screen reader - and rules text is mostly symbols. Passing the raw token
// through made every cost read as "open brace U close brace" (#51).
const SYMBOL_WORDS: Record<string, string> = {
  W: "white",
  U: "blue",
  B: "black",
  R: "red",
  G: "green",
  C: "colorless",
  S: "snow",
  X: "X",
};

// Standalone symbols that aren't mana at all, so "... mana" would be wrong.
const STANDALONE_WORDS: Record<string, string> = {
  T: "tap",
  Q: "untap",
  E: "energy counter",
};

function describeSymbol(token: string): string {
  if (STANDALONE_WORDS[token]) {
    return STANDALONE_WORDS[token];
  }

  const parts = token.split("/");
  const word = (part: string) => SYMBOL_WORDS[part] ?? (/^\d+$/.test(part) ? `${part} generic` : part);

  // Phyrexian ({W/P}) is one symbol payable with white *or* 2 life - not a
  // choice between two manas, so it doesn't take the "or" phrasing.
  if (parts.includes("P")) {
    return `${parts.filter((part) => part !== "P").map(word).join(" ")} Phyrexian mana`;
  }

  return `${parts.map(word).join(" or ")} mana`;
}

export function ManaText({ text, className }: ManaTextProps) {
  const parts = text.split(/(\{[^}]+\})/g);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        const match = /^\{([^}]+)\}$/.exec(part);
        if (!match) {
          return part;
        }
        const code = encodeURIComponent(match[1].replace(/\//g, "").toUpperCase());
        const spoken = describeSymbol(match[1].toUpperCase());
        return (
          <img
            key={index}
            src={`https://svgs.scryfall.io/card-symbols/${code}.svg`}
            alt={spoken}
            title={spoken}
            className="mx-px inline-block h-[1em] w-[1em] align-[-0.1em]"
          />
        );
      })}
    </span>
  );
}
