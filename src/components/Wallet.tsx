'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { supabase } from '@/lib/supabase'
import {
  getWalletBalance,
  getWalletHistory,
  liquidateWallet,
  WalletTransaction,
} from '@/lib/wallet'

interface WalletProps {
  profileId: string
  color: string
  name: string
  isParent?: boolean
}

// Coins/bills breakdown for a given euro amount
function getCoinsBreakdown(amount: number): string {
  const denominations = [
    { value: 2.00, label: '2€' },
    { value: 1.00, label: '1€' },
    { value: 0.50, label: '50c' },
    { value: 0.20, label: '20c' },
    { value: 0.10, label: '10c' },
    { value: 0.05, label: '5c' },
    { value: 0.02, label: '2c' },
    { value: 0.01, label: '1c' },
  ]

  let remaining = Math.round(amount * 100)
  const parts: string[] = []

  for (const { value, label } of denominations) {
    const cents = Math.round(value * 100)
    const count = Math.floor(remaining / cents)
    if (count > 0) {
      parts.push(`${count}×${label}`)
      remaining -= count * cents
    }
  }

  return parts.join(' + ')
}

export default function Wallet({ profileId, color, name, isParent = false }: WalletProps) {
  const [balance, setBalance] = useState(0)
  const [history, setHistory] = useState<WalletTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showConfirm, setShowConfirm] = useState(false)
  const [liquidating, setLiquidating] = useState(false)
  const [justLiquidated, setJustLiquidated] = useState<number | null>(null)

  const load = useCallback(async () => {
    const [bal, hist] = await Promise.all([
      getWalletBalance(profileId),
      getWalletHistory(profileId, 15),
    ])
    setBalance(bal)
    setHistory(hist)
    setLoading(false)
  }, [profileId])

  useEffect(() => {
    load()

    // Realtime updates
    const channel = supabase
      .channel(`wallet:${profileId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'wallet',
        filter: `profile_id=eq.${profileId}`,
      }, () => load())
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'wallet_transactions',
        filter: `profile_id=eq.${profileId}`,
      }, () => load())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profileId, load])

  async function handleLiquidate() {
    setLiquidating(true)
    const amount = await liquidateWallet(profileId)
    setJustLiquidated(amount)
    setLiquidating(false)
    setShowConfirm(false)

    // Celebration
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.5 },
      colors: ['#FFD700', '#FFA500', '#58CC02', '#1CB0F6'],
    })

    await load()
    setTimeout(() => setJustLiquidated(null), 4000)
  }

  const liquidations = history.filter((t) => t.type === 'liquidate')
  const totalEarned = history.filter((t) => t.type === 'earn').reduce((s, t) => s + t.amount_euros, 0)

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-3" />
        <div className="h-16 bg-gray-100 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Balance card */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
              Saldo acumulat
            </p>
            <motion.p
              key={balance}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              className="text-5xl font-black mt-1"
              style={{ color }}
            >
              {balance.toFixed(2)}€
            </motion.p>
          </div>
          <span className="text-5xl">💰</span>
        </div>

        {/* Coins breakdown */}
        {balance > 0 && (
          <div
            className="rounded-xl p-3 mb-4 text-xs font-semibold text-gray-600"
            style={{ backgroundColor: `${color}15` }}
          >
            <p className="text-xs text-gray-400 mb-1">Desglossament en monedes:</p>
            <p style={{ color }}>{getCoinsBreakdown(balance)}</p>
          </div>
        )}

        {/* Liquidate button */}
        {balance > 0 ? (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowConfirm(true)}
            className="w-full py-4 rounded-2xl text-white font-black text-lg flex items-center justify-center gap-2"
            style={{ backgroundColor: color }}
          >
            <span>💵</span>
            <span>Demanar {balance.toFixed(2)}€</span>
          </motion.button>
        ) : (
          <div className="w-full py-4 rounded-2xl bg-gray-100 text-gray-400 font-bold text-center">
            Saldo a zero · Segueix fent rutines!
          </div>
        )}
      </div>

      {/* Just liquidated banner */}
      <AnimatePresence>
        {justLiquidated !== null && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center"
          >
            <p className="text-2xl mb-1">🎉</p>
            <p className="font-black text-green-700 text-lg">
              {justLiquidated.toFixed(2)}€ entregats!
            </p>
            <p className="text-green-600 text-sm mt-1">
              {getCoinsBreakdown(justLiquidated)}
            </p>
            <p className="text-green-500 text-xs mt-1">Saldo posat a zero</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Liquidation history */}
      {liquidations.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-base font-black text-gray-800">Historial de liquidacions</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {liquidations.map((tx) => (
              <div key={tx.id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">💵</span>
                  <div>
                    <p className="text-sm font-bold text-gray-800">Liquidació</p>
                    <p className="text-xs text-gray-400">
                      {new Date(tx.created_at).toLocaleDateString('ca-ES', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <p className="font-black text-lg text-green-600">
                  {Math.abs(tx.amount_euros).toFixed(2)}€
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirm modal */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm text-center"
            >
              <p className="text-5xl mb-3">💰</p>
              <h2 className="text-2xl font-black text-gray-800 mb-2">
                Liquidar {balance.toFixed(2)}€?
              </h2>
              <p className="text-gray-500 mb-2">
                S'entregaran monedes i bitllets a <strong>{name}</strong>:
              </p>
              <p className="font-bold text-gray-700 mb-5 text-sm bg-gray-50 rounded-xl p-3">
                {getCoinsBreakdown(balance)}
              </p>
              <p className="text-xs text-gray-400 mb-6">
                El saldo quedarà a zero.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-bold"
                >
                  Cancel·lar
                </button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleLiquidate}
                  disabled={liquidating}
                  className="flex-1 py-3 rounded-2xl text-white font-black disabled:opacity-50"
                  style={{ backgroundColor: color }}
                >
                  {liquidating ? '...' : '✅ Entregar!'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
