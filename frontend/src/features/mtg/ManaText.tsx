interface ManaTextProps {
  text: string;
  className?: string;
}

// Scryfall syntax ({R}, {2}, {W/U}, {T}) rendered as Scryfall's own symbol
// SVGs, which are free to hotlink like the card images already are. The
// filename is the token without braces or slashes: {W/U} -> WU.svg.
// Anything that isn't a known symbol still resolves to a broken image, so
// the raw token stays in alt= and shows in its place.
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
        return (
          <img
            key={index}
            src={`https://svgs.scryfall.io/card-symbols/${code}.svg`}
            alt={part}
            title={part}
            className="mx-px inline-block h-[1em] w-[1em] align-[-0.1em]"
          />
        );
      })}
    </span>
  );
}
