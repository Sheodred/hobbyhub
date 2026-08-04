import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { ApiError } from "../../lib/apiClient";
import { createListing, getListing, updateListing, type ListingCategory, type ListingStatus } from "./api";
import { categoryLabels } from "./categoryLabels";

const STATUS_OPTIONS: ListingStatus[] = ["ACTIVE", "RESERVED", "SOLD"];

export function ListingFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ListingCategory>("OTHER");
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState("");
  const [status, setStatus] = useState<ListingStatus>("ACTIVE");
  // One image URL per line - kept simple since v1 is URL-only anyway (docs/adr/0005).
  const [imageUrlsText, setImageUrlsText] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const { data: existing } = useQuery({
    queryKey: ["listing", id],
    queryFn: () => getListing(id!),
    enabled: isEditing,
  });

  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setDescription(existing.description ?? "");
      setCategory(existing.category);
      setPrice(String(existing.price));
      setCondition(existing.condition);
      setStatus(existing.status === "REMOVED" ? "ACTIVE" : existing.status);
      setImageUrlsText(existing.imageUrls.join("\n"));
    }
  }, [existing]);

  const mutation = useMutation({
    mutationFn: () => {
      const imageUrls = imageUrlsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      const values = { title, description, category, price: Number(price), condition, imageUrls };
      return isEditing ? updateListing(id!, { ...values, status }) : createListing(values);
    },
    onSuccess: (listing) => {
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      queryClient.invalidateQueries({ queryKey: ["listing", listing.id] });
      navigate(`/marketplace/${listing.id}`);
    },
    onError: (err) => {
      setFormError(err instanceof ApiError ? err.message : "Something went wrong saving this listing.");
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    mutation.mutate();
  }

  return (
    <div className="mx-auto max-w-lg">
      <Link to={isEditing ? `/marketplace/${id}` : "/marketplace"} className="text-sm text-indigo-400 hover:underline">
        &larr; Back
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-slate-100">
        {isEditing ? "Edit listing" : "New listing"}
      </h1>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-slate-300">
          Title
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-300">
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-300">
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ListingCategory)}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
          >
            {Object.entries(categoryLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-300">
          Price (€)
          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-300">
          Condition
          <input
            required
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            placeholder="e.g. Near Mint, Good, Excellent"
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 placeholder:text-slate-500"
          />
        </label>

        {isEditing && (
          <label className="flex flex-col gap-1 text-sm text-slate-300">
            Status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ListingStatus)}
              className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="flex flex-col gap-1 text-sm text-slate-300">
          Image URLs (one per line, optional)
          <textarea
            value={imageUrlsText}
            onChange={(e) => setImageUrlsText(e.target.value)}
            rows={3}
            placeholder="https://..."
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 placeholder:text-slate-500"
          />
        </label>

        {formError && (
          <p role="alert" className="text-sm text-rose-400">
            {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="mt-2 rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
        >
          {mutation.isPending ? "Saving…" : isEditing ? "Save changes" : "Create listing"}
        </button>
      </form>
    </div>
  );
}
