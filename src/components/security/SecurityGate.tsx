import React, { useState } from 'react'
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  Key,
  Eye,
  EyeOff,
  AlertTriangle,
  Cpu,
  Zap,
  Sparkles,
} from 'lucide-react'
import { useSecurity } from '@/context/SecurityContext'

export const SecurityGate: React.FC = () => {
  const { unlock } = useSecurity()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [shake, setShake] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) return

    setIsVerifying(true)
    setErrorMessage(null)

    // Simulate high-tech biometric / signature computation
    setTimeout(() => {
      const result = unlock(password)

      if (result.success) {
        setIsSuccess(true)
        setIsVerifying(false)
      } else {
        setIsVerifying(false)
        setErrorMessage(result.message || 'You are Ultron and you are not permitted.')
        setShake(true)
        setTimeout(() => setShake(false), 600)
      }
    }, 400)
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#070A10] overflow-hidden select-none font-sans">
      {/* Background Cyber Grid & Radial Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#131D2E] via-[#090D15] to-[#04060A] opacity-90" />
      
      {/* Subtle Holographic Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#3B82F6 1px, transparent 1px), linear-gradient(to right, #3B82F6 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Floating Technological Arc Reactor Rings */}
      <div className="absolute flex items-center justify-center pointer-events-none opacity-20">
        <div className="h-[520px] w-[520px] rounded-full border border-dashed border-[#3B82F6] animate-[spin_60s_linear_infinite]" />
        <div className="absolute h-[420px] w-[420px] rounded-full border border-dotted border-[#60A5FA] animate-[spin_40s_linear_infinite_reverse]" />
        <div className="absolute h-[320px] w-[320px] rounded-full border border-[#202838] animate-pulse" />
      </div>

      {/* Main Terminal Gate Card */}
      <div
        className={`relative z-10 w-full max-w-md mx-4 rounded-2xl border ${
          errorMessage
            ? 'border-[#F05265] shadow-[0_0_40px_rgba(240,82,101,0.25)]'
            : isSuccess
            ? 'border-[#18C784] shadow-[0_0_40px_rgba(24,199,132,0.25)]'
            : 'border-[#202838] shadow-[0_0_50px_rgba(0,0,0,0.8)]'
        } bg-[#0D121C]/95 p-8 backdrop-blur-xl transition-all duration-300 ${
          shake ? 'animate-bounce' : ''
        }`}
      >
        {/* Top Arc Core Emblem */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-5 flex h-20 w-20 items-center justify-center">
            {/* Outer pulsing ring */}
            <div
              className={`absolute inset-0 rounded-full border-2 ${
                errorMessage
                  ? 'border-[#F05265] animate-ping opacity-30'
                  : isSuccess
                  ? 'border-[#18C784] animate-ping opacity-30'
                  : 'border-[#3B82F6] animate-pulse opacity-40'
              }`}
            />
            {/* Center Core */}
            <div
              className={`relative flex h-16 w-16 items-center justify-center rounded-2xl border shadow-inner transition-colors duration-300 ${
                errorMessage
                  ? 'border-[#F05265]/50 bg-[#F05265]/10 text-[#F05265]'
                  : isSuccess
                  ? 'border-[#18C784]/50 bg-[#18C784]/10 text-[#18C784]'
                  : 'border-[#3B82F6]/50 bg-[#141A26] text-[#3B82F6]'
              }`}
            >
              {errorMessage ? (
                <ShieldAlert className="h-8 w-8" />
              ) : isSuccess ? (
                <ShieldCheck className="h-8 w-8" />
              ) : (
                <Lock className="h-8 w-8" />
              )}
            </div>
          </div>

          {/* Titles */}
          <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold tracking-widest text-[#8493A8] uppercase mb-1">
            <Cpu className="h-3.5 w-3.5 text-[#3B82F6]" />
            <span>JARVIS DEFENSE PROTOCOL • LEVEL 7</span>
          </div>

          <h1 className="text-xl font-extrabold tracking-tight text-[#E2E8F0]">
            Autonomous Terminal Clearance
          </h1>

          <p className="mt-1 text-xs text-[#8493A8] max-w-xs leading-relaxed">
            Enter the authorized Stark security passphrase to decrypt your trading journal.
          </p>
        </div>

        {/* Ultron Warning Alert */}
        {errorMessage && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-[#F05265]/60 bg-[#F05265]/10 p-3.5 text-xs text-[#F05265] animate-in fade-in duration-200">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold tracking-wide uppercase text-[11px] text-[#F05265]">
                INTRUSION DETECTED • PROTOCOL REJECTED
              </div>
              <p className="mt-0.5 font-medium text-white/95">
                {errorMessage}
              </p>
            </div>
          </div>
        )}

        {/* Success Clearance Notification */}
        {isSuccess && (
          <div className="mt-5 flex items-center gap-2.5 rounded-xl border border-[#18C784]/60 bg-[#18C784]/10 p-3.5 text-xs text-[#18C784] animate-in fade-in duration-200">
            <ShieldCheck className="h-5 w-5 shrink-0" />
            <div>
              <div className="font-bold uppercase text-[11px]">ACCESS GRANTED</div>
              <p className="text-white/90">Welcome back, Mr. Stark. Decrypting 12-hour session...</p>
            </div>
          </div>
        )}

        {/* Security Password Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-[#8493A8] mb-1.5">
              Protocol Passphrase
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#8493A8]">
                <Key className="h-4 w-4" />
              </div>

              <input
                type={showPassword ? 'text' : 'password'}
                autoFocus
                disabled={isVerifying || isSuccess}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (errorMessage) setErrorMessage(null)
                }}
                placeholder="Enter passphrase..."
                className={`w-full rounded-xl border bg-[#10141E] pl-9 pr-10 py-3 text-sm text-[#E2E8F0] placeholder-[#475569] font-mono tracking-wider focus:outline-none transition-all ${
                  errorMessage
                    ? 'border-[#F05265] focus:border-[#F05265] focus:ring-1 focus:ring-[#F05265]'
                    : isSuccess
                    ? 'border-[#18C784]'
                    : 'border-[#202838] focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]'
                }`}
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#8493A8] hover:text-[#E2E8F0] transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isVerifying || isSuccess || !password.trim()}
            className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 px-4 font-bold text-xs uppercase tracking-wider text-white shadow-lg transition-all duration-200 cursor-pointer ${
              errorMessage
                ? 'bg-[#F05265] hover:bg-[#d63b4e] shadow-[#F05265]/25'
                : isSuccess
                ? 'bg-[#18C784] shadow-[#18C784]/25'
                : 'bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#3B82F6] hover:to-[#2563EB] shadow-[#3B82F6]/25 disabled:opacity-50'
            }`}
          >
            {isVerifying ? (
              <>
                <Cpu className="h-4 w-4 animate-spin" />
                <span>Verifying Signature...</span>
              </>
            ) : isSuccess ? (
              <>
                <Unlock className="h-4 w-4" />
                <span>Clearance Confirmed</span>
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                <span>Initialize Clearance</span>
              </>
            )}
          </button>
        </form>

        {/* 12-Hour Session Expiry Policy Footer */}
        <div className="mt-6 pt-4 border-t border-[#202838] flex flex-col items-center text-center">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#64748B]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-ping" />
            <span>SESSION VALIDITY: 12 HOURS</span>
          </div>
          <p className="mt-1 text-[10px] text-[#64748B]">
            Manual power-off termination switch available anytime on dashboard
          </p>
        </div>
      </div>
    </div>
  )
}
