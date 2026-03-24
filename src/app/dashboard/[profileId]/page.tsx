'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useSession } from '@/context/SessionContext'
import { useProfile, useAllProfiles } from '@/hooks/useProfile'
import { useRoutines, useTodayLogs } from '@/hooks/useRoutines'
import { Routine, RoutineLog, CATEGORY_LABELS, RoutineCategory, Profile } from '@/types'
import Navbar from '@/components/Navbar'
import RoutineCard from '@/components/RoutineCard'
import BehaviorSelector from '@/components/BehaviorSelector'
import CelebrationOverlay from '@/components/CelebrationOverlay'
import LevelProgress from '@/components/LevelProgress'
import WeeklyStats from '@/components/WeeklyStats'
import RewardProgress from '@/components/RewardProgress'
import BadgesDisplay from '@/components/BadgesDisplay'
import AvatarUpload from '@/components/AvatarUpload'
import { supabase } from '@/lib/supabase'
import { updateProfilePoints, checkAndAwardBadges, getWeeklyPoints } from '@/lib/points'
import { resumeAudio } from '@/lib/sound'
import { BehaviorScore } from '@/types'

const CATEGORIES: RoutineCategory[] = ['mati', 'tarda', 'nit', 'cap_de_setmana']

export default function DashboardPage({ params }: { params: Promise<{ profileId: string }> }) {
  const { profileId } = use(params)
  const router = useRouter()
  const { session, isParent } = useSession()
  const { profile, loading: profileLoading } = useProfile(profileId)
  const { profiles: allProfiles } = useAllProfiles()
  const { routines, loading: routinesLoading } = useRoutines()
  const { logs, loggedRoutineIds, loading: logsLoading } = useTodayLogs(profileId)

  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null)
  const [celebration, setCelebration] = useState<{ visible: boolean; message: string; sub: string }>({
    visible: false,
    message: '',
    sub: '',
  })
  const [activeTab, setActiveTab] = useState<'rutines' | 'stats' | 'perfil'>('rutines')
  const [targetProfileId, setTargetProfileId] = useState(profileId) // for parent logging

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

  const isViewingOwnProfile = session?.profileId === profileId
  const girls = allProfiles.filter((p) => p.role === 'nena')

  const today = new Date()
  const isWeekend = today.getDay() === 0 || today.getDay() === 6

  function getRoutinesByCategory(category: RoutineCategory) {
    return routines.filter((r) => {
      if (r.is_weekend_only && !isWeekend) return false
      if (!r.is_weekend_only && category === 'cap_de_setmana') return false
      return r.category === category
    })
  }

  function getLogForRoutine(routineId: string): RoutineLog | undefined {
    return logs.find((l) => l.routine_id === routineId && l.profile_id === targetProfileId)
  }

  async function handleBehaviorSelect(score: BehaviorScore, points: number) {
    if (!selectedRoutine || !session) return
    resumeAudio()

    const loggedBy = session.profileId
    const targetId = isParent ? targetProfileId : profileId

    // Check if this routine already has a log today (to avoid double-counting)
    const { data: existingLogs } = await supabase
      .from('routine_logs')
      .select('id, points_awarded')
      .eq('profile_id', targetId)
      .eq('routine_id', selectedRoutine.id)
      .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
      .lt('created_at', new Date(new Date().setHours(24, 0, 0, 0)).toISOString())
      .limit(1)

    const existingLog = existingLogs?.[0]

    if (existingLog) {
      // Revert old points and delete old log
      await updateProfilePoints(targetId, -existingLog.points_awarded)
      await supabase.from('routine_logs').delete().eq('id', existingLog.id)
    }

    // Insert new log
    const { error } = await supabase.from('routine_logs').insert({
      profile_id: targetId,
      routine_id: selectedRoutine.id,
      score,
      points_awarded: points,
      logged_by: loggedBy,
    })

    if (error) {
      console.error(error)
      setSelectedRoutine(null)
      return
    }

    // Update total points
    await updateProfilePoints(targetId, points)

    if (score === 'good') {
      const newBadges = await checkAndAwardBadges(targetId)

      const targetProfile = allProfiles.find((p) => p.id === targetId)
      const name = targetProfile?.name || 'Nena'
      setCelebration({
        visible: true,
        message: `🎉 Molt bé, ${name}!`,
        sub: `+${points} punts! ${newBadges.length > 0 ? '🏅 Nova insígnia!' : ''}`,
      })
    }

    setSelectedRoutine(null)
  }

  // For parent: which girl is being viewed
  const effectiveProfileId = isParent ? targetProfileId : profileId
  const effectiveProfile = isParent
    ? allProfiles.find((p) => p.id === targetProfileId) || profile
    : profile

  return (
    <div
      className="min-h-dvh flex flex-col"
      style={{ background: `linear-gradient(135deg, ${profile.color}15 0%, #F0F4FF 60%)` }}
    >
      <Navbar
        profile={profile}
        rightAction={
          <button
            onClick={() => router.push('/leaderboard')}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <span className="text-xl">🏆</span>
          </button>
        }
      />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 pb-24">
        {/* Parent: girl selector */}
        {isParent && (
          <div className="mt-4 mb-2">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
              Registrant per a:
            </p>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {girls.map((girl) => (
                <button
                  key={girl.id}
                  onClick={() => setTargetProfileId(girl.id)}
                  className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-sm transition-all border-2 ${
                    targetProfileId === girl.id
                      ? 'text-white border-transparent'
                      : 'bg-white border-gray-200 text-gray-600'
                  }`}
                  style={targetProfileId === girl.id ? { backgroundColor: girl.color, borderColor: girl.color } : {}}
                >
                  {girl.avatar_url ? (
                    <img src={girl.avatar_url} alt={girl.name} className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black" style={{ backgroundColor: girl.color }}>
                      {girl.name[0]}
                    </div>
                  )}
                  {girl.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex bg-white rounded-2xl p-1 mt-4 mb-4 shadow-sm">
          {(['rutines', 'stats', 'perfil'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${
                activeTab === tab ? 'bg-gray-800 text-white shadow' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'rutines' ? '📋 Rutines' : tab === 'stats' ? '📊 Estadístiques' : '👤 Perfil'}
            </button>
          ))}
        </div>

        {/* ===== RUTINES TAB ===== */}
        {activeTab === 'rutines' && (
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
                  onRoutineClick={(r) => setSelectedRoutine(r)}
                />
              )
            })}
          </div>
        )}

        {/* ===== STATS TAB ===== */}
        {activeTab === 'stats' && (
          <div className="space-y-4">
            <WeeklyStats profileId={effectiveProfileId} color={effectiveProfile.color} />
            <LevelProgress totalPoints={effectiveProfile.total_points} color={effectiveProfile.color} />
            <RewardProgressWrapper profileId={effectiveProfileId} color={effectiveProfile.color} />
            <BadgesDisplay profileId={effectiveProfileId} color={effectiveProfile.color} />
          </div>
        )}

        {/* ===== PERFIL TAB ===== */}
        {activeTab === 'perfil' && (
          <ProfileTab
            profile={effectiveProfile}
            isEditable={session?.profileId === effectiveProfileId || isParent}
          />
        )}
      </main>

      {/* Behavior selector */}
      {selectedRoutine && (
        <BehaviorSelector
          routine={selectedRoutine}
          loggedByParent={isParent}
          onSelect={handleBehaviorSelect}
          onCancel={() => setSelectedRoutine(null)}
        />
      )}

      {/* Celebration */}
      <CelebrationOverlay
        visible={celebration.visible}
        message={celebration.message}
        subMessage={celebration.sub}
        onComplete={() => setCelebration((prev) => ({ ...prev, visible: false }))}
      />
    </div>
  )
}

function CategorySection({
  category,
  routines,
  logs,
  effectiveProfileId,
  onRoutineClick,
}: {
  category: RoutineCategory
  routines: Routine[]
  logs: RoutineLog[]
  effectiveProfileId: string
  onRoutineClick: (r: Routine) => void
}) {
  const doneCount = routines.filter((r) => logs.some((l) => l.routine_id === r.id && l.profile_id === effectiveProfileId)).length

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-black text-gray-700 text-base">
          {CATEGORY_LABELS[category]}
        </h3>
        <span className="font-bold text-gray-400 text-sm">
          {doneCount}/{routines.length}
        </span>
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
              index={i}
            />
          )
        })}
      </div>
    </div>
  )
}

function RewardProgressWrapper({ profileId, color }: { profileId: string; color: string }) {
  const [weeklyPoints, setWeeklyPoints] = useState(0)

  useEffect(() => {
    getWeeklyPoints(profileId).then(setWeeklyPoints)
  }, [profileId])

  return <RewardProgress weeklyPoints={weeklyPoints} color={color} />
}

function ProfileTab({ profile, isEditable }: { profile: Profile; isEditable: boolean }) {
  return (
    <div className="space-y-4">
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
              {new Date(profile.birth_date).toLocaleDateString('ca-ES', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          )}
        </div>
      </div>
      <LevelProgress totalPoints={profile.total_points} color={profile.color} />
      <BadgesDisplay profileId={profile.id} color={profile.color} />
    </div>
  )
}

