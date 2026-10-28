import { useState } from "react";
import { Star } from "lucide-react";

/**
 * Star rating + optional review, shown after a job completes.
 * Calls onSubmit(rating, review) and surfaces any server error inline.
 */
export default function RatingForm({ mechanicName = "your mechanic", onSubmit, onSkip }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!rating) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(rating, review.trim());
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-md border border-signal/30 bg-signal/5 p-6">
      <p className="font-display text-2xl text-ink">Job complete — how was {mechanicName}?</p>

      <div className="mt-3 flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
          >
            <Star size={28} className={n <= (hover || rating) ? "fill-amber text-amber" : "text-ink/20"} />
          </button>
        ))}
      </div>

      <textarea
        value={review}
        onChange={(e) => setReview(e.target.value)}
        maxLength={500}
        rows={2}
        placeholder="Anything to add? (optional)"
        className="mt-3 w-full rounded-sm border border-ink/15 bg-white px-3 py-2 font-body text-sm text-ink placeholder:text-ink/30"
      />

      {error && <p className="mt-2 font-body text-sm text-flare">{error}</p>}

      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={!rating || submitting}
          className="rounded-sm bg-ink px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-paper disabled:opacity-40"
        >
          {submitting ? "Sending…" : "Submit rating"}
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="rounded-sm px-4 py-2 font-mono text-xs uppercase tracking-[0.1em] text-ink/50"
        >
          Skip
        </button>
      </div>
    </form>
  );
}
