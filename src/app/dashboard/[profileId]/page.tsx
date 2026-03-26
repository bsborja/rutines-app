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
import RoutineManager from '@/components/RoutineManager'
import { supabase } from '@/lib/supabase'
import { updateProfilePoints, checkAndAwardBadges, getWeeklyPoints, getWeekendStart, getLevelFromPoints } from '@/lib/points'
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
  const [showRoutineManager, setShowRoutineManager] = useState(false)

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

    // Check if this routine already has a log in the active window (day or full weekend for cap_de_setmana)
    let checkStart: Date
    let checkEnd: Date
    if (selectedRoutine.is_weekend_only && isWeekend) {
      checkStart = getWeekendStart()
      checkEnd = new Date(checkStart)
      checkEnd.setDate(checkEnd.getDate() + 2)
    } else {
      checkStart = new Date()
      checkStart.setHours(0, 0, 0, 0)
      checkEnd = new Date()
      checkEnd.setHours(24, 0, 0, 0)
    }

    const { data: existingLogs } = await supabase
      .from('routine_logs')
      .select('id, points_awarded')
      .eq('profile_id', targetId)
      .eq('routine_id', selectedRoutine.id)
      .gte('created_at', checkStart.toISOString())
      .lt('created_at', checkEnd.toISOString())
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
        {/* Parent: girl selector + routine manager button */}
        {isParent && (
          <div className="mt-4 mb-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
                Registrant per a:
              </p>
              <button
                onClick={() => setShowRoutineManager(true)}
                className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-700 bg-white px-3 py-1.5 rounded-xl border border-gray-200 hover:border-gray-400 transition-all shadow-sm"
              >
                ⚙️ Gestió de rutines
              </button>
            </div>
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
            {isParent && (
              <ManualPointsAdjustment
                profile={effectiveProfile}
                girls={girls}
              />
            )}
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

      {/* Routine Manager (parents only) */}
      {showRoutineManager && (
        <RoutineManager onClose={() => setShowRoutineManager(false)} />
      )}
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

function ManualPointsAdjustment({ profile, girls }: { profile: Profile; girls: Profile[] }) {
  const [adjustment, setAdjustment] = useState('')
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  function showMsg(msg: string) {
    setMessage(msg)
    setTimeout(() => setMessage(null), 2500)
  }

  async function handleSave() {
    const delta = parseInt(adjustment)
    if (isNaN(delta) || delta === 0) return
    setSaving(true)
    await updateProfilePoints(profile.id, delta)
    setAdjustment('')
    showMsg(`${delta > 0 ? '+' : ''}${delta} punts guardats ✓`)
    setSaving(false)
  }

  async function handleSyncAll() {
    setSyncing(true)
    for (const girl of girls) {
      const { data: logs } = await supabase
        .from('routine_logs')
        .select('points_awarded')
        .eq('profile_id', girl.id)
      if (logs) {
        const total = Math.max(0, logs.reduce((s: number, l: { points_awarded: number }) => s + l.points_awarded, 0))
        const level = getLevelFromPoints(total)
        await supabase.from('profiles').update({ total_points: total, level }).eq('id', girl.id)
      }
    }
    showMsg('Tots els punts recalculats ✓')
    setSyncing(false)
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <h3 className="text-base font-black text-gray-800 mb-1">Ajust manual de punts</h3>
      <p className="text-xs text-gray-400 mb-4">
        Total actual de <span className="font-bold">{profile.name}</span>:{' '}
        <span className="font-black text-gray-700">{profile.total_points} pts</span>
      </p>

      <div className="flex gap-2 mb-3">
        <input
          type="number"
          value={adjustment}
          onChange={(e) => setAdjustment(e.target.value)}
          placeholder="+10 o -5"
          className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2 font-bold text-gray-800 focus:outline-none focus:border-gray-400 text-center"
        />
        <button
          onClick={handleSave}
          disabled={saving || !adjustment || adjustment === '0'}
          className="px-5 py-2 rounded-xl font-black text-white text-sm transition-all disabled:opacity-40"
          style={{ backgroundColor: '#3498DB' }}
        >
          {saving ? '...' : '💾 Guardar'}
        </button>
      </div>

      <button
        onClick={handleSyncAll}
        disabled={syncing}
        className="w-full py-2.5 rounded-xl border-2 border-gray-200 text-sm font-bold text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-all disabled:opacity-40"
      >
        {syncing ? 'Recalculant...' : '🔄 Sincronitzar tots els usuaris'}
      </button>

      {message && (
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-sm font-bold text-green-600 mt-3"
        >
          {message}
        </motion.p>
      )}
    </div>
  )
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

