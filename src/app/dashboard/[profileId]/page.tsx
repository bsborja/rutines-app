'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from '@/context/SessionContext'
import { useProfile, useAllProfiles } from '@/hooks/useProfile'
import { useRoutines, useTodayLogs, useProfileRoutinePoints } from '@/hooks/useRoutines'
import {
  Routine, RoutineLog, CATEGORY_LABELS, RoutineCategory, Profile, EffectivePoints, FantasticAnimal
} from '@/types'
import Navbar from '@/components/Navbar'
import RoutineCard from '@/components/RoutineCard'
import BehaviorSelector from '@/components/BehaviorSelector'
import CelebrationOverlay from '@/components/CelebrationOverlay'
import LevelProgress from '@/components/LevelProgress'
import WeeklyStats from '@/components/WeeklyStats'
import WeeklyEasyView from '@/components/WeeklyEasyView'
import ActivityHeatmap from '@/components/ActivityHeatmap'
import HistoryLog from '@/components/HistoryLog'
import RewardProgress from '@/components/RewardProgress'
import BadgesDisplay from '@/components/BadgesDisplay'
import FantasticAnimalsDisplay from '@/components/FantasticAnimalsDisplay'
import AvatarUpload from '@/components/AvatarUpload'
import CollectionView from '@/components/CollectionView'
import AdminPanel from '@/components/AdminPanel'
import { supabase } from '@/lib/supabase'
import {
  updateProfilePoints, checkAndAwardBadges, getWeeklyPoints,
  getEffectivePoints, calcMaxWeeklyPoints, calcPointsPerEuro,
  checkAndUnlockAnimals,
} from '@/lib/points'
import { updateWalletEuros } from '@/lib/wallet'
import Wallet from '@/components/Wallet'
import { resumeAudio } from '@/lib/sound'
import { BehaviorScore } from '@/types'

const CATEGORIES: RoutineCategory[] = ['mati', 'tarda', 'nit', 'cap_de_setmana']

// active_weekdays bitmask: bit 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
function isRoutineActiveToday(routine: Routine): boolean {
  const dayBit = 1 << new Date().getDay()
  return (routine.active_weekdays & dayBit) !== 0
}

export default function DashboardPage({ params }: { params: Promise<{ profileId: string }> }) {
  const { profileId } = use(params)
  const router = useRouter()
  const { session, isParent } = useSession()
  const { profile, loading: profileLoading } = useProfile(profileId)
  const { profiles: allProfiles } = useAllProfiles()
  const { routines, loading: routinesLoading } = useRoutines()
  const { logs, loading: logsLoading } = useTodayLogs(profileId)
  const [targetProfileId, setTargetProfileId] = useState(profileId)
  const effectiveTargetId = isParent ? targetProfileId : profileId
  const { points: profilePointsMap } = useProfileRoutinePoints(effectiveTargetId)

  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null)
  const [celebration, setCelebration] = useState<{ visible: boolean; message: string; sub: string }>({
    visible: false, message: '', sub: '',
  })
  const [newAnimals, setNewAnimals] = useState<FantasticAnimal[]>([])
  const [animalIdx, setAnimalIdx] = useState(0)
  const [activeTab, setActiveTab] = useState<'rutines' | 'colleccio' | 'historial' | 'perfil' | 'gestio'>('rutines')

  const isAdult = profile?.role === 'pare' || profile?.role === 'mare'

  // Auth guard
  useEffect(() => {
    if (!session) router.replace('/')
    else if (session.profileId !== profileId && !isParent) router.replace(`/dashboard/${session.profileId}`)
  }, [session, profileId, isParent, router])

  if (profileLoading || routinesLoading || logsLoading || !profile) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#F0F4FF]">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="text-5xl">⭐</motion.div>
      </div>
    )
  }

  const girls = allProfiles.filter((p) => p.role === 'nena')
  const today = new Date()
  const isWeekend = today.getDay() === 0 || today.getDay() === 6

  function getRoutinesByCategory(category: RoutineCategory) {
    return routines.filter((r) => {
      if (!isRoutineActiveToday(r)) return false
      if (r.is_weekend_only && !isWeekend) return false
      if (!r.is_weekend_only && category === 'cap_de_setmana') return false
      return r.category === category
    })
  }

  async function handleSkipRoutine(routine: Routine) {
    if (!session) return
    resumeAudio()
    const targetId = isParent ? targetProfileId : profileId

    const { data: existingLogs } = await supabase
      .from('routine_logs')
      .select('id, points_awarded')
      .eq('profile_id', targetId)
      .eq('routine_id', routine.id)
      .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
      .lt('created_at', new Date(new Date().setHours(24, 0, 0, 0)).toISOString())
      .limit(1)

    const existing = existingLogs?.[0]
    if (existing) {
      await updateProfilePoints(targetId, -existing.points_awarded)
      await updateWalletEuros(targetId, -existing.points_awarded / pointsPerEuro)
      await supabase.from('routine_logs').delete().eq('id', existing.id)
    }

    await supabase.from('routine_logs').insert({
      profile_id: targetId,
      routine_id: routine.id,
      score: 'skip',
      points_awarded: 0,
      logged_by: session.profileId,
    })
  }

  async function handleBehaviorSelect(score: BehaviorScore, points: number) {
    if (!selectedRoutine || !session) return
    resumeAudio()
    const targetId = isParent ? targetProfileId : profileId

    const { data: existingLogs } = await supabase
      .from('routine_logs')
      .select('id, points_awarded')
      .eq('profile_id', targetId)
      .eq('routine_id', selectedRoutine.id)
      .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
      .lt('created_at', new Date(new Date().setHours(24, 0, 0, 0)).toISOString())
      .limit(1)

    const existing = existingLogs?.[0]
    if (existing) {
      await updateProfilePoints(targetId, -existing.points_awarded)
      await updateWalletEuros(targetId, -existing.points_awarded / pointsPerEuro)
      await supabase.from('routine_logs').delete().eq('id', existing.id)
    }

    const { error } = await supabase.from('routine_logs').insert({
      profile_id: targetId,
      routine_id: selectedRoutine.id,
      score,
      points_awarded: points,
      logged_by: session.profileId,
    })

    if (error) { console.error(error); setSelectedRoutine(null); return }

    await updateProfilePoints(targetId, points)
    await updateWalletEuros(targetId, points / pointsPerEuro)

    if (score === 'good') {
      const [newBadges, unlocked] = await Promise.all([
        checkAndAwardBadges(targetId),
        checkAndUnlockAnimals(targetId),
      ])
      const name = allProfiles.find((p) => p.id === targetId)?.name || 'Nena'
      if (unlocked.length > 0) { setNewAnimals(unlocked); setAnimalIdx(0) }
      setCelebration({
        visible: true,
        message: `🎉 Molt bé, ${name}!`,
        sub: `+${points} punts!${newBadges.length > 0 ? ' 🏅 Nova insígnia!' : ''}${unlocked.length > 0 ? ' 🐉 Animal nou!' : ''}`,
      })
    }
    setSelectedRoutine(null)
  }

  const effectiveProfileId = effectiveTargetId
  const effectiveProfile = isParent
    ? allProfiles.find((p) => p.id === targetProfileId) || profile
    : profile
  const maxWeeklyPoints = calcMaxWeeklyPoints(routines, profilePointsMap)
  const pointsPerEuro = calcPointsPerEuro(maxWeeklyPoints)

  const girlSelector = isParent && (
    <div className="mt-4 mb-2">
      <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Registrant per a:</p>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {girls.map((girl) => (
          <button
            key={girl.id}
            onClick={() => setTargetProfileId(girl.id)}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-sm transition-all border-2 ${
              targetProfileId === girl.id ? 'text-white border-transparent' : 'bg-white border-gray-200 text-gray-600'
            }`}
            style={targetProfileId === girl.id ? { backgroundColor: girl.color, borderColor: girl.color } : {}}
          >
            {girl.avatar_url
              ? <img src={girl.avatar_url} alt={girl.name} className="w-7 h-7 rounded-full object-cover" />
              : <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black" style={{ backgroundColor: girl.color }}>{girl.name[0]}</div>
            }
            {girl.name}
          </button>
        ))}
      </div>
    </div>
  )

  const sharedRoutinesTab = (
    <div className="space-y-6 mt-2">
      {CATEGORIES.map((category) => {
        const catRoutines = getRoutinesByCategory(category)
        if (catRoutines.length === 0) return null
        return (
          <CategorySection
            key={category}
            category={category}
            routines={catRoutines}
            logs={logs}
            effectiveProfileId={effectiveProfileId}
            isParent={isParent}
            pointsPerEuro={pointsPerEuro}
            onRoutineClick={(r) => setSelectedRoutine(r)}
            onSkip={handleSkipRoutine}
          />
        )
      })}
    </div>
  )

  // ─── ADULT view ────────────────────────────────────────────────────────────
  if (isAdult) {
    return (
      <div className="min-h-dvh flex flex-col" style={{ background: `linear-gradient(135deg, ${profile.color}15 0%, #F0F4FF 60%)` }}>
        <Navbar profile={profile} rightAction={
          <button onClick={() => router.push('/leaderboard')} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <span className="text-xl">🏆</span>
          </button>
        } />
        <main className={`flex-1 mx-auto w-full px-4 pb-24 ${activeTab === 'gestio' ? 'max-w-4xl' : 'max-w-2xl'}`}>
          {activeTab !== 'gestio' && girlSelector}
          <div className="flex bg-white rounded-2xl p-1 mt-4 mb-4 shadow-sm">
            {(['rutines', 'gestio'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${
                  activeTab === tab ? 'bg-gray-800 text-white shadow' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'rutines' ? '📋 Rutines' : '⚙️ Gestió'}
              </button>
            ))}
          </div>
          {activeTab === 'rutines' && sharedRoutinesTab}
          {activeTab === 'gestio' && (
            <AdminPanel profiles={allProfiles} routines={routines} />
          )}
        </main>
        {selectedRoutine && (
          <BehaviorSelector routine={selectedRoutine} effectivePoints={getEffectivePoints(selectedRoutine, profilePointsMap)} loggedByParent onSelect={handleBehaviorSelect} onCancel={() => setSelectedRoutine(null)} />
        )}
        <CelebrationOverlay visible={celebration.visible} message={celebration.message} subMessage={celebration.sub} onComplete={() => setCelebration((p) => ({ ...p, visible: false }))} />
        <AnimalUnlockOverlay animals={newAnimals} idx={animalIdx} onNext={() => { if (animalIdx < newAnimals.length - 1) setAnimalIdx(animalIdx + 1); else setNewAnimals([]) }} />
      </div>
    )
  }

  // ─── NENA view ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-dvh flex flex-col" style={{ background: `linear-gradient(135deg, ${profile.color}15 0%, #F0F4FF 60%)` }}>
      <Navbar profile={profile} rightAction={
        <button onClick={() => router.push('/leaderboard')} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <span className="text-xl">🏆</span>
        </button>
      } />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 pb-24">
        {/* Tabs: Rutines | Col·lecció | Historial | Perfil */}
        <div className="flex bg-white rounded-2xl p-1 mt-4 mb-4 shadow-sm">
          {(['rutines', 'colleccio', 'historial', 'perfil'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all ${
                activeTab === tab ? 'bg-gray-800 text-white shadow' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'rutines' ? '📋' : tab === 'colleccio' ? '🏅' : tab === 'historial' ? '📅' : '👤'}
              <span className="hidden sm:inline ml-1">
                {tab === 'rutines' ? 'Rutines' : tab === 'colleccio' ? 'Col·lecció' : tab === 'historial' ? 'Historial' : 'Perfil'}
              </span>
            </button>
          ))}
        </div>

        {activeTab === 'rutines' && sharedRoutinesTab}

        {activeTab === 'colleccio' && (
          <CollectionView
            profileId={effectiveProfileId}
            totalPoints={effectiveProfile.total_points}
            color={effectiveProfile.color}
          />
        )}

        {activeTab === 'historial' && (
          <div className="space-y-4">
            <ActivityHeatmap profileId={effectiveProfileId} color={effectiveProfile.color} />
            <HistoryLog
              profileId={effectiveProfileId}
              color={effectiveProfile.color}
              isParent={false}
              pointsPerEuro={pointsPerEuro}
              profilePointsMap={profilePointsMap}
              routines={routines}
            />
          </div>
        )}

        {/* Perfil = avatar + estadístiques fusionades + animals + wallet */}
        {activeTab === 'perfil' && (
          <div className="space-y-4">
            <ProfileTab profile={effectiveProfile} isEditable={session?.profileId === effectiveProfileId} />
            <WeeklyEasyView profileId={effectiveProfileId} color={effectiveProfile.color} />
            <WeeklyStats profileId={effectiveProfileId} color={effectiveProfile.color} maxWeeklyPoints={maxWeeklyPoints} pointsPerEuro={pointsPerEuro} />
            <LevelProgress totalPoints={effectiveProfile.total_points} color={effectiveProfile.color} />
            <RewardProgressWrapper profileId={effectiveProfileId} color={effectiveProfile.color} pointsPerEuro={pointsPerEuro} />
            <BadgesDisplay profileId={effectiveProfileId} color={effectiveProfile.color} />
            <FantasticAnimalsDisplay profileId={effectiveProfileId} currentLevel={effectiveProfile.level} color={effectiveProfile.color} />
            <Wallet profileId={effectiveProfileId} color={effectiveProfile.color} name={effectiveProfile.name} isParent={false} />
          </div>
        )}
      </main>

      {selectedRoutine && (
        <BehaviorSelector routine={selectedRoutine} effectivePoints={getEffectivePoints(selectedRoutine, profilePointsMap)} loggedByParent={false} onSelect={handleBehaviorSelect} onCancel={() => setSelectedRoutine(null)} />
      )}
      <CelebrationOverlay visible={celebration.visible} message={celebration.message} subMessage={celebration.sub} onComplete={() => setCelebration((p) => ({ ...p, visible: false }))} />
      <AnimalUnlockOverlay animals={newAnimals} idx={animalIdx} onNext={() => { if (animalIdx < newAnimals.length - 1) setAnimalIdx(animalIdx + 1); else setNewAnimals([]) }} />
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CategorySection({
  category, routines, logs, effectiveProfileId, isParent, pointsPerEuro, onRoutineClick, onSkip,
}: {
  category: RoutineCategory
  routines: Routine[]
  logs: RoutineLog[]
  effectiveProfileId: string
  isParent: boolean
  pointsPerEuro: number
  onRoutineClick: (r: Routine) => void
  onSkip: (r: Routine) => void
}) {
  const doneCount = routines.filter((r) =>
    logs.some((l) => l.routine_id === r.id && l.profile_id === effectiveProfileId && l.score !== 'skip')
  ).length

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-black text-gray-700 text-base">{CATEGORY_LABELS[category]}</h3>
        <span className="font-bold text-gray-400 text-sm">{doneCount}/{routines.length}</span>
      </div>
      <div className="space-y-2">
        {routines.map((routine, i) => {
          const log = logs.find((l) => l.routine_id === routine.id && l.profile_id === effectiveProfileId)
          return (
            <RoutineCard
              key={routine.id}
              routine={routine}
              log={log}
              onClick={() => onRoutineClick(routine)}
              onSkip={log ? undefined : () => onSkip(routine)}
              index={i}
            />
          )
        })}
      </div>
    </div>
  )
}

function RewardProgressWrapper({ profileId, color, pointsPerEuro }: { profileId: string; color: string; pointsPerEuro: number }) {
  const [weeklyPoints, setWeeklyPoints] = useState(0)
  useEffect(() => { getWeeklyPoints(profileId).then(setWeeklyPoints) }, [profileId])
  return <RewardProgress weeklyPoints={weeklyPoints} color={color} pointsPerEuro={pointsPerEuro} />
}

function ProfileTab({ profile, isEditable }: { profile: Profile; isEditable: boolean }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col items-center gap-4">
      <AvatarUpload
        profileId={profile.id}
        currentUrl={profile.avatar_url}
        color={profile.color}
        name={profile.name}
        size={100}
        editable={isEditable}
      />
      <div className="text-center">
        <h2 className="text-3xl font-black text-gray-800">{profile.name}</h2>
        {profile.birth_date && (
          <p className="text-gray-400 text-sm mt-1">
            {new Date(profile.birth_date).toLocaleDateString('ca-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        )}
      </div>
    </div>
  )
}

function AnimalUnlockOverlay({ animals, idx, onNext }: { animals: FantasticAnimal[]; idx: number; onNext: () => void }) {
  const animal = animals[idx]
  if (!animal) return null
  return (
    <AnimatePresence>
      <motion.div
        key={animal.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-6"
      >
        <motion.div
          initial={{ scale: 0.5, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-xs text-center"
        >
          <p className="text-xs font-black text-yellow-500 uppercase tracking-widest mb-2">✨ Animal desbloquejat!</p>
          <motion.p
            animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-8xl mb-4"
          >
            {animal.emoji}
          </motion.p>
          <h2 className="text-2xl font-black text-gray-800 mb-1">{animal.name}</h2>
          <p className="text-sm text-gray-500 mb-6">{animal.description}</p>
          <button onClick={onNext} className="w-full py-3 rounded-2xl bg-gray-800 text-white font-black text-lg">
            {idx < animals.length - 1 ? 'Següent 🐾' : 'Genial! 🎉'}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
