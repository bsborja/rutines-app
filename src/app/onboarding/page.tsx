'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { hashPin } from '@/lib/points'
import { PROFILE_COLORS } from '@/types'
import AvatarUpload from '@/components/AvatarUpload'

const DEFAULT_PROFILES = [
  { name: 'Maria', role: 'nena' as const, birth_date: '2018-02-04', color: PROFILE_COLORS.Maria, is_julia_mode: false },
  { name: 'Berta', role: 'nena' as const, birth_date: '2020-05-01', color: PROFILE_COLORS.Berta, is_julia_mode: false },
  { name: 'Julia', role: 'nena' as const, birth_date: '2022-05-06', color: PROFILE_COLORS.Julia, is_julia_mode: true },
  { name: 'Borja', role: 'pare' as const, birth_date: null, color: PROFILE_COLORS.Borja, is_julia_mode: false },
  { name: 'Montse', role: 'mare' as const, birth_date: null, color: PROFILE_COLORS.Montse, is_julia_mode: false },
]

type StepId = 'welcome' | 'pins' | 'photos' | 'done'

const STEPS: StepId[] = ['welcome', 'pins', 'photos', 'done']

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<StepId>('welcome')
  const [createdProfiles, setCreatedProfiles] = useState<Array<{ id: string; name: string; color: string; role: string }>>([])
  const [borjaPin, setBorjaPin] = useState('')
  const [montsePin, setMontsePin] = useState('')
  const [confirmBorja, setConfirmBorja] = useState('')
  const [confirmMontse, setConfirmMontse] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  async function handleCreateProfiles() {
    setLoading(true)
    const inserted: typeof createdProfiles = []

    for (const p of DEFAULT_PROFILES) {
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: crypto.randomUUID(),
          name: p.name,
          role: p.role,
          birth_date: p.birth_date,
          color: p.color,
          is_julia_mode: p.is_julia_mode,
          level: 1,
          total_points: 0,
          avatar_url: null,
          pin_hash: null,
        })
        .select()
        .single()

      if (!error && data) {
        inserted.push({ id: data.id, name: data.name, color: data.color, role: data.role })
      }
    }

    setCreatedProfiles(inserted)
    setLoading(false)
    setStep('pins')
  }

  async function handleSetPins() {
    const errs: Record<string, string> = {}

    if (borjaPin.length !== 4) errs.borja = 'El PIN ha de tenir 4 dígits'
    if (montsePin.length !== 4) errs.montse = 'El PIN ha de tenir 4 dígits'
    if (borjaPin !== confirmBorja) errs.borjaConfirm = 'Els PINs no coincideixen'
    if (montsePin !== confirmMontse) errs.montseConfirm = 'Els PINs no coincideixen'

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setLoading(true)
    setErrors({})

    const [borjaHash, montseHash] = await Promise.all([hashPin(borjaPin), hashPin(montsePin)])

    const borjaProfile = createdProfiles.find((p) => p.name === 'Borja')
    const montseProfile = createdProfiles.find((p) => p.name === 'Montse')

    if (borjaProfile)
      await supabase.from('profiles').update({ pin_hash: borjaHash }).eq('id', borjaProfile.id)
    if (montseProfile)
      await supabase.from('profiles').update({ pin_hash: montseHash }).eq('id', montseProfile.id)

    setLoading(false)
    setStep('photos')
  }

  function handleDone() {
    router.replace('/')
  }

  const stepIndex = STEPS.indexOf(step)

  return (
    <div className="min-h-dvh bg-[#F0F4FF] flex flex-col">
      {/* Progress bar */}
      <div className="h-1.5 bg-gray-200">
        <motion.div
          animate={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
          className="h-full bg-[#58CC02] rounded-full"
          transition={{ duration: 0.4 }}
        />
      </div>

      <div className="flex-1 flex flex-col p-6 max-w-lg mx-auto w-full">
        <AnimatePresence mode="wait">
          {step === 'welcome' && (
            <WelcomeStep key="welcome" onNext={handleCreateProfiles} loading={loading} />
          )}
          {step === 'pins' && (
            <PinsStep
              key="pins"
              borjaPin={borjaPin}
              montsePin={montsePin}
              confirmBorja={confirmBorja}
              confirmMontse={confirmMontse}
              onBorjaPinChange={setBorjaPin}
              onMontsePinChange={setMontsePin}
              onConfirmBorjaChange={setConfirmBorja}
              onConfirmMontseChange={setConfirmMontse}
              errors={errors}
              onNext={handleSetPins}
              loading={loading}
            />
          )}
          {step === 'photos' && (
            <PhotosStep
              key="photos"
              profiles={createdProfiles}
              onNext={() => setStep('done')}
            />
          )}
          {step === 'done' && (
            <DoneStep key="done" onDone={handleDone} />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function WelcomeStep({ onNext, loading }: { onNext: () => void; loading: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="flex-1 flex flex-col items-center justify-center text-center gap-6"
    >
      <div className="text-8xl">⭐</div>
      <div>
        <h1 className="text-4xl font-black text-gray-800 mb-3">Benvinguts a Rutines!</h1>
        <p className="text-gray-600 text-lg leading-relaxed">
          Gestiona les rutines de les nenes d&apos;una manera divertida i motivadora.
        </p>
        <ul className="mt-4 space-y-2 text-left">
          {['Registra rutines del dia a dia', 'Guanya punts i puges de nivell', 'Competeix de forma saludable', 'Desbloqueja recompenses'].map((item) => (
            <li key={item} className="flex items-center gap-2 text-gray-600">
              <span className="text-green-500 font-bold">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </div>
      <button
        onClick={onNext}
        disabled={loading}
        className="w-full py-5 bg-[#58CC02] text-white rounded-2xl font-black text-xl shadow-lg hover:bg-[#46A302] transition-colors disabled:opacity-70"
      >
        {loading ? 'Configurant...' : 'Comencem! 🚀'}
      </button>
    </motion.div>
  )
}

function PinsStep({
  borjaPin, montsePin, confirmBorja, confirmMontse,
  onBorjaPinChange, onMontsePinChange, onConfirmBorjaChange, onConfirmMontseChange,
  errors, onNext, loading
}: {
  borjaPin: string; montsePin: string; confirmBorja: string; confirmMontse: string
  onBorjaPinChange: (v: string) => void; onMontsePinChange: (v: string) => void
  onConfirmBorjaChange: (v: string) => void; onConfirmMontseChange: (v: string) => void
  errors: Record<string, string>; onNext: () => void; loading: boolean
}) {
  function PinInput({ label, value, onChange, error, placeholder }: {
    label: string; value: string; onChange: (v: string) => void; error?: string; placeholder?: string
  }) {
    return (
      <div>
        <label className="block text-sm font-bold text-gray-600 mb-1">{label}</label>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder={placeholder || '• • • •'}
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-center text-2xl tracking-widest font-black focus:outline-none focus:border-[#58CC02] transition-colors"
        />
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="flex-1 flex flex-col gap-6"
    >
      <div className="text-center">
        <div className="text-5xl mb-3">🔒</div>
        <h2 className="text-2xl font-black text-gray-800">Configurar PINs</h2>
        <p className="text-gray-500 mt-1">Crea un PIN de 4 dígits per a cada pare</p>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-full bg-[#3498DB] flex items-center justify-center text-white font-black">B</div>
          <h3 className="font-black text-gray-800 text-lg">Borja</h3>
        </div>
        <PinInput label="PIN" value={borjaPin} onChange={onBorjaPinChange} error={errors.borja} />
        <PinInput label="Confirmar PIN" value={confirmBorja} onChange={onConfirmBorjaChange} error={errors.borjaConfirm} />
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-full bg-[#1ABC9C] flex items-center justify-center text-white font-black">M</div>
          <h3 className="font-black text-gray-800 text-lg">Montse</h3>
        </div>
        <PinInput label="PIN" value={montsePin} onChange={onMontsePinChange} error={errors.montse} />
        <PinInput label="Confirmar PIN" value={confirmMontse} onChange={onConfirmMontseChange} error={errors.montseConfirm} />
      </div>

      <button
        onClick={onNext}
        disabled={loading}
        className="w-full py-5 bg-[#58CC02] text-white rounded-2xl font-black text-xl shadow-lg hover:bg-[#46A302] transition-colors disabled:opacity-70 mt-auto"
      >
        {loading ? 'Guardant...' : 'Continuar →'}
      </button>
    </motion.div>
  )
}

function PhotosStep({
  profiles,
  onNext,
}: {
  profiles: Array<{ id: string; name: string; color: string; role: string }>
  onNext: () => void
}) {
  const [avatarUrls, setAvatarUrls] = useState<Record<string, string>>({})

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="flex-1 flex flex-col gap-6"
    >
      <div className="text-center">
        <div className="text-5xl mb-3">📸</div>
        <h2 className="text-2xl font-black text-gray-800">Fotos de perfil</h2>
        <p className="text-gray-500 mt-1">Opcional — podeu afegir-les més tard</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {profiles.map((profile) => (
          <div key={profile.id} className="bg-white rounded-2xl p-4 shadow-sm flex flex-col items-center gap-2">
            <AvatarUpload
              profileId={profile.id}
              currentUrl={avatarUrls[profile.id] || null}
              color={profile.color}
              name={profile.name}
              size={72}
              editable
              onUpload={(url) => setAvatarUrls((prev) => ({ ...prev, [profile.id]: url }))}
            />
            <p className="font-bold text-gray-700 text-sm">{profile.name}</p>
          </div>
        ))}
      </div>

      <button
        onClick={onNext}
        className="w-full py-5 bg-[#58CC02] text-white rounded-2xl font-black text-xl shadow-lg hover:bg-[#46A302] transition-colors mt-auto"
      >
        Continuar →
      </button>
    </motion.div>
  )
}

function DoneStep({ onDone }: { onDone: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex-1 flex flex-col items-center justify-center text-center gap-6"
    >
      <motion.div
        animate={{ rotate: [0, 15, -15, 10, -10, 0], scale: [1, 1.2, 1] }}
        transition={{ duration: 1, delay: 0.3 }}
        className="text-8xl"
      >
        🎉
      </motion.div>
      <div>
        <h2 className="text-3xl font-black text-gray-800 mb-3">Tot llest!</h2>
        <p className="text-gray-600 text-lg">
          Ja podeu començar a registrar les rutines. A gaudir!
        </p>
      </div>
      <button
        onClick={onDone}
        className="w-full py-5 bg-[#58CC02] text-white rounded-2xl font-black text-xl shadow-lg hover:bg-[#46A302] transition-colors"
      >
        Anar a l&apos;app! 🚀
      </button>
    </motion.div>
  )
}
