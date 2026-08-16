import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { FadeIn } from "../../components/FadeIn";
import { ApiError } from "../../lib/apiClient";
import { getCard, getPrintings } from "./api";
import { ComboPanel } from "./ComboPanel";
import { ManaText } from "./ManaText";

export function MtgCardDetailPage() {
  const { id } = useParams<{ id: string }>();

  const {
    data: card,
    isFetching,
    isError,
    error,
  } = useQuery({
    queryKey: ["mtg-card", id],
    queryFn: () => getCard(id!),
    enabled: Boolean(id),
  });

  const { data: printings } = useQuery({
    queryKey: ["mtg-printings", card?.name],
    queryFn: () => getPrintings(card!.name),
    enabled: Boolean(card),
  });

  const [faceIndex, setFaceIndex] = useState(0);
  // The route reuses this component, so without a reset another printing of a
  // flipped card would open on its back face.
  useEffect(() => setFaceIndex(0), [id]);

  if (isFetching) {
    return <p className="text-slate-400">Loading card…</p>;
  }

  if (isError) {
    return (
      <div>
        <p role="alert" className="text-rose-400">
          {error instanceof ApiError && error.status === 404
            ? "Card not found."
            : "Something went wrong loading this card."}
        </p>
        <Link to="/mtg" className="mt-4 inline-block text-sm text-indigo-400 hover:underline">
          &larr; Back to search
        </Link>
      </div>
    );
  }

  if (!card) {
    return null;
  }

  const faces = card.faces ?? [];
  // transform/modal_dfc are two physical sides; split/adventure are one side
  // carrying two halves, so they stack instead of flipping.
  const flippable = (card.layout === "transform" || card.layout === "modal_dfc") && faces.length > 1;
  const stacked = (card.layout === "split" || card.layout === "adventure") && faces.length > 1;
  const shown = flippable ? faces[faceIndex] ?? faces[0] : card;
  const nextFace = faces[(faceIndex + 1) % faces.length];
  const imageUrl = shown.imageUrl ?? card.imageUrl;

  return (
    <FadeIn key={card.id}>
      <Link to="/mtg" className="text-sm text-indigo-400 hover:underline">
        &larr; Back to search
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="w-full max-w-xs shrink-0">
            {imageUrl && (
              <img
                src={imageUrl}
                alt={shown.name}
                className="w-full rounded-lg border border-slate-800"
              />
            )}
            {flippable && (
              <button
                type="button"
                onClick={() => setFaceIndex((index) => (index + 1) % faces.length)}
                className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-indigo-400 transition-colors hover:border-indigo-500/60 hover:text-indigo-300"
              >
                Flip to {nextFace.name}
              </button>
            )}
          </div>

          <div>
            <h1 className="text-2xl font-semibold text-slate-100">{card.name}</h1>
            {stacked ? (
              <>
                {card.typeLine && <p className="mt-3 text-sm font-medium text-slate-300">{card.typeLine}</p>}
                {faces.map((face) => (
                  <div key={face.name} className="mt-4">
                    <h2 className="text-base font-semibold text-slate-200">{face.name}</h2>
                    {face.manaCost && <ManaText text={face.manaCost} className="mt-1 block text-slate-400" />}
                    {face.oracleText && (
                      <ManaText text={face.oracleText} className="mt-1 block whitespace-pre-line text-slate-300" />
                    )}
                  </div>
                ))}
              </>
            ) : (
              <>
                {shown.manaCost && <ManaText text={shown.manaCost} className="mt-1 block text-slate-400" />}
                {shown.typeLine && (
                  <p className="mt-3 text-sm font-medium text-slate-300">{shown.typeLine}</p>
                )}
                {shown.oracleText && (
                  <ManaText text={shown.oracleText} className="mt-2 block whitespace-pre-line text-slate-300" />
                )}
              </>
            )}

            <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {card.setName && (
                <>
                  <dt className="text-slate-400">Set</dt>
                  <dd className="text-slate-300">{card.setName}</dd>
                </>
              )}
              {card.rarity && (
                <>
                  <dt className="text-slate-400">Rarity</dt>
                  <dd className="capitalize text-slate-300">{card.rarity}</dd>
                </>
              )}
            </dl>
          </div>
        </div>

        <ComboPanel cardName={card.name} />
      </div>

      {printings && printings.length > 1 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            All printings ({printings.length})
          </h2>
          <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {printings.map((printing) => (
              <Link
                key={printing.id}
                to={`/mtg/${printing.id}`}
                // The indigo border was the only marker for "the printing you
                // are looking at" - colour alone, invisible to a screen reader
                // (WCAG 1.4.1). aria-current carries the same meaning in text.
                aria-current={printing.id === card.id ? "page" : undefined}
                className={`group overflow-hidden rounded-lg border transition-colors ${
                  printing.id === card.id
                    ? "border-indigo-500"
                    : "border-slate-800 hover:border-indigo-500/60"
                }`}
              >
                {printing.imageUrl ? (
                  <img
                    src={printing.imageUrl}
                    alt={`${printing.name} - ${printing.setName}`}
                    className="aspect-[5/7] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[5/7] w-full items-center justify-center bg-slate-800 p-1 text-center text-[10px] text-slate-400">
                    {printing.setName}
                  </div>
                )}
                <p className="truncate p-1 text-center text-[11px] text-slate-400 group-hover:text-indigo-400">
                  {printing.setName}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </FadeIn>
  );
}
