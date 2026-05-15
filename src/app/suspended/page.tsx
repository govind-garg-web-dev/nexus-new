export default function SuspendedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center dot-grid px-6">
      <div className="max-w-md w-full text-center">
        <div className="text-5xl mb-6">🔒</div>
        <h1 className="font-display font-bold text-white text-3xl mb-3">
          Account Suspended
        </h1>
        <p className="font-tech text-sm text-white/60 leading-relaxed mb-6">
          Your account has been suspended because your Reliability Score dropped below 25.
          This happens due to repeated verified reports of ghosting, harassment, or fraud.
        </p>
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 text-left mb-6">
          <p className="font-tech text-sm text-amber-200 leading-relaxed">
            <span className="font-bold">To appeal:</span> Contact the NullSpace team at your college with your registered email.
            Appeals are reviewed within 72 hours.
          </p>
        </div>
        <p className="font-tech text-xs text-white/30">
          Your data is retained. If the appeal is successful, your account is reinstated with a score of 30.
        </p>
      </div>
    </div>
  );
}
