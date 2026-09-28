import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Upload, X, RotateCcw, Check, AlertCircle, ImageIcon, Pill } from 'lucide-react';
import { useI18n } from '@/lib/i18n-context';

type Props = {
  onScan: (data: { name: string; dosage: string }) => void;
  onClose: () => void;
};

type Phase = 'capture' | 'review';

export function MedicineScanner({ onScan, onClose }: Props) {
  const { t } = useI18n();
  const [phase, setPhase] = useState<Phase>('capture');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      });
      setStream(s);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch {
      setErrorMsg(t('scanError'));
    }
  }, [t]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((tr) => tr.stop());
      setStream(null);
    }
  }, [stream]);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1080;
    canvas.height = video.videoHeight || 1080;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setPhoto(canvas.toDataURL('image/jpeg', 0.9));
    setPhase('review');
    stopCamera();
  }, [stopCamera]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPhoto(reader.result as string);
      setPhase('review');
    };
    reader.readAsDataURL(file);
  }, []);

  const retake = useCallback(() => {
    setPhoto(null);
    setName('');
    setDosage('');
    setErrorMsg('');
    setPhase('capture');
    startCamera();
  }, [startCamera]);

  const canSubmit = name.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onScan({ name: name.trim(), dosage: dosage.trim() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-slideUp">
        {/* Header */}
        <div className="bg-teal-600 px-5 py-4 flex items-center justify-between sticky top-0 z-10">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Camera className="w-5 h-5" />
            {t('scanMedicine')}
          </h3>
          <button
            onClick={() => { stopCamera(); onClose(); }}
            className="text-white/80 hover:text-white transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {phase === 'capture' && (
            <div className="space-y-4">
              <canvas ref={canvasRef} className="hidden" />
              <p className="text-sm text-slate-500 text-center">{t('scanHint')}</p>

              <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-900 border-2 border-slate-200">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-4/5 h-3/5 border-2 border-teal-400/70 rounded-xl shadow-lg" />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={capturePhoto}
                  disabled={!stream}
                  className="flex-1 py-3.5 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Camera className="w-5 h-5" />
                  {t('camera')}
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-3.5 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                >
                  <ImageIcon className="w-5 h-5" />
                  {t('uploadPhoto')}
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> {errorMsg}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          )}

          {phase === 'review' && photo && (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden bg-slate-100 border-2 border-slate-200">
                <img src={photo} alt="Medicine label" className="w-full max-h-64 object-contain" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">{t('medicineName')} *</label>
                <div className="relative">
                  <Pill className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input pl-10"
                    placeholder="Metformin"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">{t('dosage')}</label>
                <input
                  type="text"
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                  className="input"
                  placeholder="500 mg"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={retake}
                  className="flex-1 py-3.5 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-5 h-5" />
                  {t('retakePhoto')}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="flex-1 py-3.5 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Check className="w-5 h-5" />
                  {t('usePhoto')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
