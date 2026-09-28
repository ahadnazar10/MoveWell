import { useId, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { StarIcon } from "@phosphor-icons/react";
import { StarRatingInput } from "./StarRatingInput.js";
import styles from "./ReviewList.module.css";

const dateFormat = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function Stars({ rating }) {
  return (
    <span
      className={styles.reviewStars}
      aria-label={`${rating} out of 5 stars`}
      role="img"
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon
          key={n}
          size={14}
          weight={n <= rating ? "fill" : "regular"}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

Stars.propTypes = { rating: PropTypes.number.isRequired };

function ReviewForm({ onAddReview }) {
  const id = useId();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const titleRef = useRef(null);
  const textRef = useRef(null);

  function validate() {
    const next = {};
    if (!rating) next.rating = "Choose a star rating";
    if (!title.trim()) next.title = "Add a title";
    if (!text.trim()) next.text = "Write a few words about the product";
    return next;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const next = validate();
    setErrors(next);
    if (next.rating) {
      document.getElementsByName(`${id}-stars`)[0]?.focus();
      return;
    }
    if (next.title) return titleRef.current?.focus();
    if (next.text) return textRef.current?.focus();

    setSubmitting(true);
    setFormError("");
    try {
      // Stored and shown exactly as typed (React escapes it on display, so
      // any HTML in a review is shown as text, never run).
      await onAddReview({ rating, title: title.trim(), text });
    } catch (err) {
      setFormError(err?.message ?? "Your review couldn't be saved. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <h3>Write a review</h3>
      {formError && (
        <p className={styles.errorAlert} role="alert">
          {formError}
        </p>
      )}

      <StarRatingInput
        value={rating}
        onChange={setRating}
        error={errors.rating}
        name={`${id}-stars`}
      />

      <div className={styles.formGroup}>
        <label htmlFor={`${id}-title`}>Title</label>
        <input
          ref={titleRef}
          id={`${id}-title`}
          type="text"
          value={title}
          maxLength={120}
          onChange={(e) => setTitle(e.target.value)}
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={errors.title ? `${id}-title-error` : undefined}
        />
        {errors.title && (
          <p id={`${id}-title-error`} className={styles.fieldError}>
            {errors.title}
          </p>
        )}
      </div>

      <div className={styles.formGroup}>
        <label htmlFor={`${id}-text`}>Your review</label>
        <textarea
          ref={textRef}
          id={`${id}-text`}
          rows={4}
          value={text}
          maxLength={2000}
          onChange={(e) => setText(e.target.value)}
          aria-invalid={errors.text ? true : undefined}
          aria-describedby={errors.text ? `${id}-text-error` : undefined}
        />
        {errors.text && (
          <p id={`${id}-text-error`} className={styles.fieldError}>
            {errors.text}
          </p>
        )}
      </div>

      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? "Posting…" : "Post review"}
      </button>
    </form>
  );
}

ReviewForm.propTypes = { onAddReview: PropTypes.func.isRequired };

/**
 * Average, count per star (5 to 1), newest first, and the add-review form.
 * One review per shopper: once they have reviewed, the form is replaced.
 */
export function ReviewList({
  reviews,
  status = "succeeded",
  alreadyReviewed,
  onAddReview,
  onRetry,
}) {
  const { average, counts } = useMemo(() => {
    const tally = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;
    for (const r of reviews) {
      tally[r.rating] = (tally[r.rating] ?? 0) + 1;
      sum += r.rating;
    }
    return { average: reviews.length ? sum / reviews.length : 0, counts: tally };
  }, [reviews]);

  const newestFirst = useMemo(
    () => [...reviews].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [reviews]
  );

  return (
    <div className={styles.container}>
      <div className={styles.summarySection}>
        <div className={styles.avgBox}>
          <span className={styles.avgScore}>{average.toFixed(1)}</span>
          <Stars rating={Math.round(average)} />
          <span className={styles.totalReviews}>
            {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
          </span>
        </div>

        <ul className={styles.breakdown} aria-label="Ratings breakdown">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = counts[star];
            const pct = reviews.length ? (count / reviews.length) * 100 : 0;
            return (
              <li key={star} className={styles.barRow}>
                <span className={styles.barLabel}>{star} star</span>
                <span className={styles.barTrack} aria-hidden="true">
                  <span className={styles.barFill} style={{ width: `${pct}%` }} />
                </span>
                <span className={styles.barCount}>{count}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className={styles.contentGrid}>
        <div className={styles.reviewsList}>
          <h3>Reviews</h3>
          {status === "loading" && reviews.length === 0 ? (
            <p className="muted" role="status">
              Loading reviews…
            </p>
          ) : status === "failed" ? (
            <div role="alert">
              <p className="muted">Reviews couldn&apos;t be loaded.</p>
              <button type="button" className="btn btn-secondary" onClick={onRetry}>
                Retry
              </button>
            </div>
          ) : newestFirst.length === 0 ? (
            <p className="muted">No reviews yet. Be the first to review this product.</p>
          ) : (
            <ol className={styles.reviewItems}>
              {newestFirst.map((r) => (
                <li key={r.id ?? r.createdAt} className={styles.reviewCard}>
                  <div className={styles.reviewHeader}>
                    <Stars rating={r.rating} />
                    <time className={styles.reviewDate} dateTime={r.createdAt}>
                      {dateFormat.format(new Date(r.createdAt))}
                    </time>
                  </div>
                  <h4 className={styles.reviewTitle}>{r.title}</h4>
                  <p className={styles.reviewComment}>{r.text ?? r.comment}</p>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className={styles.formContainer}>
          {alreadyReviewed ? (
            <p className={styles.reviewed}>Thanks, you&apos;ve reviewed this product.</p>
          ) : (
            <ReviewForm onAddReview={onAddReview} />
          )}
        </div>
      </div>
    </div>
  );
}

ReviewList.propTypes = {
  reviews: PropTypes.arrayOf(
    PropTypes.shape({
      rating: PropTypes.number.isRequired,
      title: PropTypes.string,
      text: PropTypes.string,
      createdAt: PropTypes.string,
    })
  ).isRequired,
  status: PropTypes.string,
  alreadyReviewed: PropTypes.bool.isRequired,
  onAddReview: PropTypes.func.isRequired,
  onRetry: PropTypes.func,
};
