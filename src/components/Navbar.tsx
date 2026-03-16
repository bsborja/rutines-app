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

  function handleHome() {
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
        {/* Left: home button (always visible) */}
        <button
          onClick={handleHome}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          title="Inici"
        >
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </button>

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

        {/* Right: custom action slot */}
        <div className="w-10 flex justify-end">
          {rightAction ?? null}
        </div>
      </div>
    </motion.header>
  )
}
