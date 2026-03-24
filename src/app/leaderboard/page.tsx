'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Leaderboard from '@/components/Leaderboard'
import Navbar from '@/components/Navbar'

export default function LeaderboardPage() {
  const router = useRouter()

  return (
    <div className="min-h-dvh bg-[#F0F4FF] flex flex-col">
      <Navbar
        title="🏆 Classificació"
        showBack
        rightAction={
          <button
            onClick={() => router.push('/')}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <span className="text-xl">🏠</span>
          </button>
        }
      />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 text-center"
        >
          <h1 className="text-3xl font-black text-gray-800">Qui és la millor?</h1>
          <p className="text-gray-500 mt-1">Comparativa de les nenes</p>
        </motion.div>

        <Leaderboard />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 bg-blue-50 rounded-2xl p-4 border border-blue-100"
        >
          <p className="text-blue-700 text-sm text-center font-semibold">
            💡 Els punts mostrats són els d'aquesta setmana o mes. Els punts totals determinen el nivell.
          </p>
        </motion.div>
      </main>
    </div>
  )
}
