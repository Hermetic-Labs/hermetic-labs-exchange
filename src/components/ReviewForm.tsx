/**
 * Review Form Component
 * 
 * A form for submitting product reviews
 */

import { useState } from 'react';
import { Star, Loader2, CheckCircle } from 'lucide-react';
import { submitReview, isAuthenticated } from '../api/exchange';

interface ReviewFormProps {
    packageSlug: string;
    onReviewSubmitted: () => void;
}

export function ReviewForm({ packageSlug, onReviewSubmitted }: ReviewFormProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isAuthenticated()) {
            setError('Please sign in to write a review');
            return;
        }

        if (rating === 0) {
            setError('Please select a rating');
            return;
        }

        if (!title.trim() || !content.trim()) {
            setError('Please fill in all fields');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            await submitReview({
                packageSlug,
                rating,
                title: title.trim(),
                content: content.trim(),
            });
            setSuccess(true);
            setTimeout(() => {
                setIsOpen(false);
                setSuccess(false);
                setRating(0);
                setTitle('');
                setContent('');
                onReviewSubmitted();
            }, 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to submit review');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="cyber-btn"
            >
                Write a Review
            </button>
        );
    }

    if (success) {
        return (
            <div className="cyber-panel p-6 text-center">
                <CheckCircle className="w-12 h-12 text-cyber-green mx-auto mb-3" />
                <h3 className="text-lg font-medium text-white mb-2">Review Submitted!</h3>
                <p className="text-gray-400">Thank you for your feedback</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="cyber-panel p-6 space-y-4">
            <h3 className="text-lg font-medium text-white mb-4">Write a Review</h3>

            {/* Star Rating */}
            <div>
                <label className="block text-sm text-gray-400 mb-2">Your Rating</label>
                <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            type="button"
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            onClick={() => setRating(star)}
                            className="focus:outline-none"
                        >
                            <Star
                                className={`w-8 h-8 transition-colors ${star <= (hoverRating || rating)
                                        ? 'text-yellow-400 fill-yellow-400'
                                        : 'text-gray-600'
                                    }`}
                            />
                        </button>
                    ))}
                </div>
            </div>

            {/* Title */}
            <div>
                <label className="block text-sm text-gray-400 mb-2">Review Title</label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Summarize your experience"
                    className="cyber-input w-full"
                    maxLength={100}
                />
            </div>

            {/* Content */}
            <div>
                <label className="block text-sm text-gray-400 mb-2">Your Review</label>
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="What did you like or dislike? How did this product help you?"
                    className="cyber-input w-full h-32 resize-none"
                    maxLength={2000}
                />
            </div>

            {/* Error */}
            {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded text-red-400 text-sm">
                    {error}
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
                <button
                    type="submit"
                    disabled={submitting}
                    className="cyber-btn flex items-center gap-2"
                >
                    {submitting ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Submitting...
                        </>
                    ) : (
                        'Submit Review'
                    )}
                </button>
                <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="cyber-btn-outline"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}
