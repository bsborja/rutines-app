'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useSession } from '@/context/SessionContext'
import { Profile } from '@/types'

interface NavbarProps {
  profile?: Profile | null
  showBack?: boolean
  title?: string
  rightAction?: React.ReactNode
}

export default function Navbar({ profile, showBack = false, title, rightAction }: NavbarProps) {
  const router = useRouter()
  const { logout } = useSession()

  function handleLogout() {
    logout()
    router.push('/')
  }

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 py-3"
    >
      <div className="flex items-center gap-3 max-w-2xl mx-auto">
        {/* Left: back or logo */}
        {showBack ? (
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-2xl">⭐</span>
            <span className="font-black text-lg text-gray-800">Rutines</span>
          </div>
        )}

        {/* Center: title or profile name */}
        <div className="flex-1 text-center">
          {title ? (
            <h1 className="font-black text-gray-800 text-lg">{title}</h1>
          ) : profile ? (
            <div className="flex items-center justify-center gap-2">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.name}
                  className="w-8 h-8 rounded-full object-cover border-2"
                  style={{ borderColor: profile.color }}
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-sm"
                  style={{ backgroundColor: profile.color }}
                >
                  {profile.name[0]}
                </div>
              )}
              <span className="font-black text-gray-800">{profile.name}</span>
            </div>
          ) : null}
        </div>

        {/* Right: action or logout */}
        {rightAction ? (
          rightAction
        ) : (
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
            title="Sortir"
          >
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </button>
        )}
      </div>
    </motion.header>
  )
}
