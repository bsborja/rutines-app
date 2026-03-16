'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useSession } from '@/context/SessionContext'
import { useAllProfiles } from '@/hooks/useProfile'
import { Profile, PROFILE_COLORS } from '@/types'
import PinModal from '@/components/PinModal'
import { verifyPin, hashPin } from '@/lib/points'
import { supabase } from '@/lib/supabase'
import { resumeAudio } from '@/lib/sound'

export default function ProfileSelectionPage() {
  const router = useRouter()
  const { setSession, session } = useSession()
  const { profiles, loading } = useAllProfiles()
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
  const [showPin, setShowPin] = useState(false)
  const [setupMode, setSetupMode] = useState(false)

  useEffect(() => {
    if (session) {
      router.replace(`/dashboard/${session.profileId}`)
    }
  }, [session, router])

  useEffect(() => {
    if (!loading && profiles.length === 0) {
      router.replace('/onboarding')
    }
  }, [loading, profiles, router])

  function handleProfileClick(profile: Profile) {
    resumeAudio()
    if (profile.role === 'pare' || profile.role === 'mare') {
      setSelectedProfile(profile)
      setSetupMode(!profile.pin_hash)
      setShowPin(true)
    } else {
      setSession({ profileId: profile.id, role: profile.role, name: profile.name })
      router.push(`/dashboard/${profile.id}`)
    }
  }

  async function handlePinVerify(pin: string): Promise<boolean> {
    if (!selectedProfile) return false
    if (setupMode) {
      const hash = await hashPin(pin)
      await supabase.from('profiles').update({ pin_hash: hash }).eq('id', selectedProfile.id)
      return true
    }
    if (!selectedProfile.pin_hash) return false
    return verifyPin(pin, selectedProfile.pin_hash)
  }

  function handlePinSuccess() {
    if (!selectedProfile) return
    setSession({ profileId: selectedProfile.id, role: selectedProfile.role, name: selectedProfile.name })
    setShowPin(false)
    router.push(`/dashboard/${selectedProfile.id}`)
  }

  const girls = profiles.filter((p) => p.role === 'nena')
  const parents = profiles.filter((p) => p.role === 'pare' || p.role === 'mare')

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#F0F4FF]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="text-5xl"
        >
          ⭐
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-[#F0F4FF] flex flex-col">
      {/* Header */}
      <motion.header
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="pt-12 pb-6 px-6 text-center"
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          className="text-6xl mb-3"
        >
          ⭐
        </motion.div>
        <h1 className="text-4xl font-black text-gray-800">Rutines</h1>
        <p className="text-gray-500 text-lg mt-1 font-semibold">Qui ets tu?</p>
      </motion.header>

      {/* Profiles */}
      <main className="flex-1 px-6 pb-8 max-w-lg mx-auto w-full">
        {girls.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 px-1">
              Les nenes
            </h2>
            <div className="grid grid-cols-3 gap-4">
              {girls.map((profile, i) => (
                <ProfileButton
                  key={profile.id}
                  profile={profile}
                  index={i}
                  onClick={() => handleProfileClick(profile)}
                  large
                />
              ))}
            </div>
          </section>
        )}

        {parents.length > 0 && (
          <section>
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 px-1">
              Els pares
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {parents.map((profile, i) => (
                <ProfileButton
                  key={profile.id}
                  profile={profile}
                  index={girls.length + i}
                  onClick={() => handleProfileClick(profile)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Leaderboard link */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          onClick={() => router.push('/leaderboard')}
          className="w-full mt-8 py-4 bg-white rounded-2xl shadow-sm flex items-center justify-center gap-3 text-gray-600 font-bold hover:bg-gray-50 transition-colors"
        >
          <span className="text-2xl">🏆</span>
          <span>Classificació</span>
        </motion.button>
      </main>

      {/* PIN Modal */}
      {showPin && selectedProfile && (
        <PinModal
          name={selectedProfile.name}
          avatarUrl={selectedProfile.avatar_url}
          color={selectedProfile.color || PROFILE_COLORS[selectedProfile.name] || '#3498DB'}
          onSuccess={handlePinSuccess}
          onCancel={() => {
            setShowPin(false)
            setSelectedProfile(null)
            setSetupMode(false)
          }}
          onVerify={handlePinVerify}
          isSetup={setupMode}
        />
      )}
    </div>
  )
}

function ProfileButton({
  profile,
  index,
  onClick,
  large = false,
}: {
  profile: Profile
  index: number
  onClick: () => void
  large?: boolean
}) {
  const color = profile.color || PROFILE_COLORS[profile.name] || '#9B59B6'
  const isParent = profile.role === 'pare' || profile.role === 'mare'
  const avatarSize = large ? 72 : 64

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: index * 0.08, type: 'spring', stiffness: 300 }}
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all"
    >
      <div className="relative">
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.name}
            className="rounded-full object-cover"
            style={{
              width: avatarSize,
              height: avatarSize,
              border: `3px solid ${color}`,
            }}
          />
        ) : (
          <div
            className="rounded-full flex items-center justify-center font-black text-white"
            style={{
              width: avatarSize,
              height: avatarSize,
              backgroundColor: color,
              fontSize: large ? 28 : 24,
            }}
          >
            {profile.name[0]}
          </div>
        )}
        {isParent && (
          <div className="absolute -bottom-1 -right-1 bg-white rounded-full w-6 h-6 flex items-center justify-center shadow-sm border border-gray-100">
            <span className="text-xs">🔒</span>
          </div>
        )}
      </div>

      <span className="font-black text-gray-800 text-sm text-center leading-tight">
        {profile.name}
      </span>

      {isParent && (
        <span className="text-xs text-gray-400 -mt-1">PIN</span>
      )}
    </motion.button>
  )
}
