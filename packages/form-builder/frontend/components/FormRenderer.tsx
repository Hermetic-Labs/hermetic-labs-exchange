import { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { FormField } from '../types/form';
import { Camera, MapPin, Clock, Upload, FileText, X } from 'lucide-react';

interface FormRendererProps {
  fields: FormField[];
  values: Record<string, unknown>;
  onChange: (fieldId: string, value: unknown) => void;
  readOnly?: boolean;
}

export default function FormRenderer({ fields, values, onChange, readOnly }: FormRendererProps) {
  return (
    <div className="space-y-6">
      {fields.map((field) => (
        <FieldRenderer
          key={field.id}
          field={field}
          value={values[field.id]}
          onChange={(value) => onChange(field.id, value)}
          readOnly={readOnly}
        />
      ))}
    </div>
  );
}

interface FieldRendererProps {
  field: FormField;
  value: unknown;
  onChange: (value: unknown) => void;
  readOnly?: boolean;
}

function FieldRenderer({ field, value, onChange, readOnly }: FieldRendererProps) {
  const baseInputClass = "w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100";

  switch (field.type) {
    case 'text':
    case 'email':
    case 'number':
      return (
        <FieldWrapper field={field}>
          <input
            type={field.type}
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={readOnly}
            className={baseInputClass}
            required={field.required}
          />
        </FieldWrapper>
      );

    case 'textarea':
      return (
        <FieldWrapper field={field}>
          <textarea
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={readOnly}
            rows={4}
            className={baseInputClass}
            required={field.required}
          />
        </FieldWrapper>
      );

    case 'date':
      return (
        <FieldWrapper field={field}>
          <input
            type="date"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={readOnly}
            className={baseInputClass}
            required={field.required}
          />
        </FieldWrapper>
      );

    case 'dropdown':
      return (
        <FieldWrapper field={field}>
          <select
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={readOnly}
            className={baseInputClass}
            required={field.required}
          >
            <option value="">Select an option</option>
            {field.options?.map((opt) => (
              <option key={opt.id} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FieldWrapper>
      );

    case 'checkbox':
      return (
        <FieldWrapper field={field}>
          <div className="space-y-2">
            {field.options?.map((opt) => (
              <label key={opt.id} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={((value as string[]) || []).includes(opt.value)}
                  onChange={(e) => {
                    const current = (value as string[]) || [];
                    if (e.target.checked) {
                      onChange([...current, opt.value]);
                    } else {
                      onChange(current.filter((v) => v !== opt.value));
                    }
                  }}
                  disabled={readOnly}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-gray-700">{opt.label}</span>
              </label>
            ))}
          </div>
        </FieldWrapper>
      );

    case 'radio':
      return (
        <FieldWrapper field={field}>
          <div className="space-y-2">
            {field.options?.map((opt) => (
              <label key={opt.id} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name={field.id}
                  value={opt.value}
                  checked={value === opt.value}
                  onChange={(e) => onChange(e.target.value)}
                  disabled={readOnly}
                  className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-gray-700">{opt.label}</span>
              </label>
            ))}
          </div>
        </FieldWrapper>
      );

    case 'file':
    case 'document':
      return (
        <FieldWrapper field={field}>
          <FileUploadField
            value={value as string}
            onChange={onChange}
            readOnly={readOnly}
            accept={field.type === 'document' ? '.pdf,.doc,.docx,.txt' : '*'}
            icon={field.type === 'document' ? <FileText className="w-8 h-8" /> : <Upload className="w-8 h-8" />}
          />
        </FieldWrapper>
      );

    case 'camera':
      return (
        <FieldWrapper field={field}>
          <CameraField value={value as string} onChange={onChange} readOnly={readOnly} />
        </FieldWrapper>
      );

    case 'signature':
      return (
        <FieldWrapper field={field}>
          <SignatureField value={value as string} onChange={onChange} readOnly={readOnly} />
        </FieldWrapper>
      );

    case 'geolocation':
      return (
        <FieldWrapper field={field}>
          <GeolocationField value={value as { lat: number; lng: number } | null} onChange={onChange} readOnly={readOnly} />
        </FieldWrapper>
      );

    case 'timestamp':
      return (
        <FieldWrapper field={field}>
          <TimestampField value={value as string} onChange={onChange} readOnly={readOnly} />
        </FieldWrapper>
      );

    default:
      return null;
  }
}

function FieldWrapper({ field, children }: { field: FormField; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function FileUploadField({
  value,
  onChange,
  readOnly,
  accept,
  icon,
}: {
  value: string;
  onChange: (value: unknown) => void;
  readOnly?: boolean;
  accept: string;
  icon: React.ReactNode;
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange({ name: file.name, type: file.type, data: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  if (readOnly && value) {
    return (
      <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
        <p className="text-sm text-gray-600">File uploaded: {(value as unknown as { name: string })?.name || 'Unknown'}</p>
      </div>
    );
  }

  return (
    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
      <div className="flex flex-col items-center text-gray-500">
        {icon}
        <span className="mt-2 text-sm">Click to upload</span>
      </div>
      <input type="file" accept={accept} onChange={handleChange} className="hidden" disabled={readOnly} />
    </label>
  );
}

function CameraField({
  value,
  onChange,
  readOnly,
}: {
  value: string;
  onChange: (value: unknown) => void;
  readOnly?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [showCamera, setShowCamera] = useState(false);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setStream(mediaStream);
      setShowCamera(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      alert('Could not access camera. Please check permissions.');
    }
  };

  const captureImage = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg');
      onChange(imageData);
      stopCamera();
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach(track => track.stop());
    setStream(null);
    setShowCamera(false);
  };

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [stream]);

  if (value && !showCamera) {
    return (
      <div className="relative">
        <img src={value} alt="Captured" className="w-full max-h-64 object-contain rounded-lg border border-gray-200" />
        {!readOnly && (
          <button
            onClick={() => onChange(null)}
            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  if (showCamera) {
    return (
      <div className="space-y-3">
        <video ref={videoRef} autoPlay playsInline className="w-full rounded-lg" />
        <div className="flex gap-2">
          <button onClick={captureImage} className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Capture
          </button>
          <button onClick={stopCamera} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={startCamera}
      disabled={readOnly}
      className="flex items-center justify-center gap-2 w-full py-4 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
    >
      <Camera className="w-6 h-6 text-gray-500" />
      <span className="text-gray-600">Open Camera</span>
    </button>
  );
}

function SignatureField({
  value,
  onChange,
  readOnly,
}: {
  value: string;
  onChange: (value: unknown) => void;
  readOnly?: boolean;
}) {
  const sigRef = useRef<SignatureCanvas>(null);

  const handleEnd = () => {
    if (sigRef.current) {
      onChange(sigRef.current.toDataURL());
    }
  };

  const clear = () => {
    sigRef.current?.clear();
    onChange(null);
  };

  if (readOnly && value) {
    return (
      <img src={value} alt="Signature" className="border border-gray-200 rounded-lg bg-white" />
    );
  }

  return (
    <div className="space-y-2">
      <div className="border border-gray-300 rounded-lg bg-white">
        <SignatureCanvas
          ref={sigRef}
          penColor="black"
          canvasProps={{ className: 'w-full h-40' }}
          onEnd={handleEnd}
        />
      </div>
      <button onClick={clear} className="text-sm text-gray-600 hover:text-gray-800">
        Clear signature
      </button>
    </div>
  );
}

function GeolocationField({
  value,
  onChange,
  readOnly,
}: {
  value: { lat: number; lng: number } | null;
  onChange: (value: unknown) => void;
  readOnly?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getLocation = () => {
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString(),
        });
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  if (value) {
    return (
      <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
        <div className="flex items-center gap-2 text-green-600 mb-2">
          <MapPin className="w-5 h-5" />
          <span className="font-medium">Location captured</span>
        </div>
        <p className="text-sm text-gray-600">
          Latitude: {value.lat.toFixed(6)}<br />
          Longitude: {value.lng.toFixed(6)}
        </p>
        {!readOnly && (
          <button onClick={() => onChange(null)} className="mt-2 text-sm text-blue-600 hover:underline">
            Clear location
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={getLocation}
        disabled={loading || readOnly}
        className="flex items-center justify-center gap-2 w-full py-4 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
      >
        <MapPin className="w-6 h-6 text-gray-500" />
        <span className="text-gray-600">{loading ? 'Getting location...' : 'Get Current Location'}</span>
      </button>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

function TimestampField({
  value,
  onChange,
  readOnly,
}: {
  value: string;
  onChange: (value: unknown) => void;
  readOnly?: boolean;
}) {
  const captureTimestamp = () => {
    onChange(new Date().toISOString());
  };

  if (value) {
    const date = new Date(value);
    return (
      <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
        <div className="flex items-center gap-2 text-green-600 mb-2">
          <Clock className="w-5 h-5" />
          <span className="font-medium">Timestamp captured</span>
        </div>
        <p className="text-sm text-gray-600">
          {date.toLocaleDateString()} at {date.toLocaleTimeString()}
        </p>
        {!readOnly && (
          <button onClick={() => onChange(null)} className="mt-2 text-sm text-blue-600 hover:underline">
            Clear timestamp
          </button>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={captureTimestamp}
      disabled={readOnly}
      className="flex items-center justify-center gap-2 w-full py-4 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
    >
      <Clock className="w-6 h-6 text-gray-500" />
      <span className="text-gray-600">Capture Current Time</span>
    </button>
  );
}
