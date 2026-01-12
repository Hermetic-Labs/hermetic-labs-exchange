import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { verifyPurchase } from '../api/exchange';
import { CheckCircle, Download, Loader2, AlertCircle } from 'lucide-react';

export function SuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const slug = searchParams.get('slug');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [expiresIn, setExpiresIn] = useState<number>(0);

  useEffect(() => {
    async function verify() {
      if (!sessionId) {
        setError('Invalid session');
        setLoading(false);
        return;
      }

      try {
        const result = await verifyPurchase(sessionId);
        setDownloadUrl(result.downloadUrl);
        setExpiresIn(result.expiresIn);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to verify purchase');
      } finally {
        setLoading(false);
      }
    }

    verify();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-cyber-green animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Verifying your purchase...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="cyber-panel p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Verification Failed</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <p className="text-sm text-gray-500 mb-6">
            If you completed payment, please check your email for download instructions,
            or contact support.
          </p>
          <Link to="/" className="cyber-btn">
            Back to Store
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 flex items-center justify-center">
      <div className="cyber-panel p-8 max-w-md text-center">
        <CheckCircle className="w-16 h-16 text-cyber-green mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Purchase Complete!</h1>
        <p className="text-gray-400 mb-6">
          Thank you for your purchase. Your download is ready.
        </p>

        {downloadUrl && (
          <a
            href={downloadUrl}
            className="cyber-btn flex items-center justify-center gap-2 mb-4"
            download
          >
            <Download className="w-5 h-5" /> Download Now
          </a>
        )}

        <p className="text-xs text-gray-500 mb-6">
          Download link expires in {Math.round(expiresIn / 60)} minutes.
          <br />
          You can also access your purchases from your library.
        </p>

        <div className="flex gap-3 justify-center">
          <Link to="/" className="cyber-btn-outline">
            Continue Shopping
          </Link>
          {slug && (
            <Link to={`/product/${slug}`} className="cyber-btn-outline">
              View Product
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
