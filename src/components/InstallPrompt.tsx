'use client'

import { useEffect, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    const installed = () => setVisible(false)
    window.addEventListener('appinstalled', installed)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installed)
    }
  }, [])

  if (!visible || !deferred) return null

  const onInstall = async () => {
    await deferred.prompt()
    await deferred.userChoice
    setDeferred(null)
    setVisible(false)
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm rounded-2xl bg-white p-4 shadow-xl border-2 border-[#58CC02]">
      <div className="flex items-center gap-3">
        <div className="text-3xl">⭐</div>
        <div className="flex-1">
          <div className="font-bold text-gray-900">Instal·la Rutines</div>
          <div className="text-sm text-gray-600">Accés ràpid des de la pantalla d&apos;inici</div>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => setVisible(false)}
          className="flex-1 rounded-xl border-2 border-gray-200 py-2 font-semibold text-gray-600"
        >
          Ara no
        </button>
        <button
          onClick={onInstall}
          className="flex-1 rounded-xl bg-[#58CC02] py-2 font-bold text-white"
        >
          Instal·lar
        </button>
      </div>
    </div>
  )
}
