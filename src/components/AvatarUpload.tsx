'use client'

import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'

interface AvatarUploadProps {
  profileId: string
  currentUrl?: string | null
  color: string
  name: string
  size?: number
  onUpload?: (url: string) => void
  editable?: boolean
}

export default function AvatarUpload({
  profileId,
  currentUrl,
  color,
  name,
  size = 96,
  onUpload,
  editable = false,
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [showMenu, setShowMenu] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)

  async function uploadBlob(blob: Blob, contentType: string) {
    setUploading(true)
    setError('')

    try {
      // Always use a fixed path so upsert replaces the existing file
      const path = `${profileId}/avatar`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { upsert: true, contentType })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      const publicUrl = urlData.publicUrl + `?t=${Date.now()}`

      // Explicitly UPDATE — never INSERT — and verify a row was matched
      const { data: updated, error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profileId)
        .select('id')
        .single()

      if (updateError) throw updateError
      if (!updated) throw new Error(`Perfil no trobat (id: ${profileId})`)

      // Only notify parent after the DB is confirmed updated
      onUpload?.(publicUrl)
    } catch (err: unknown) {
      setError('Error pujant la imatge')
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Selecciona una imatge vàlida')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('La imatge ha de ser menor de 5MB')
      return
    }

    await uploadBlob(file, file.type)
  }

  async function openCamera() {
    setShowMenu(false)
    setError('')

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
      })
      setStream(mediaStream)
      setShowCamera(true)

      // Attach stream to video element once the modal renders
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }
      })
    } catch (err) {
      console.error(err)
      setError("No s'ha pogut accedir a la càmera")
    }
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
    setShowCamera(false)
  }

  async function capturePhoto() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Mirror the image to match selfie expectation
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0)

    stopCamera()

    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          setError('Error capturant la foto')
          return
        }
        await uploadBlob(blob, 'image/jpeg')
      },
      'image/jpeg',
      0.9,
    )
  }

  function handleAvatarTap() {
    if (!editable) return
    setShowMenu((prev) => !prev)
  }

  function openGallery() {
    setShowMenu(false)
    inputRef.current?.click()
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Avatar + popup menu anchor */}
      <div className="relative">
        <motion.div
          whileTap={editable ? { scale: 0.95 } : {}}
          onClick={handleAvatarTap}
          className="relative"
          style={{ cursor: editable ? 'pointer' : 'default' }}
        >
          {currentUrl ? (
            <img
              src={currentUrl}
              alt={name}
              className="rounded-full object-cover border-4"
              style={{ width: size, height: size, borderColor: color }}
            />
          ) : (
            <div
              className="rounded-full flex items-center justify-center font-black text-white border-4"
              style={{
                width: size,
                height: size,
                backgroundColor: color,
                borderColor: color,
                fontSize: size * 0.4,
              }}
            >
              {name[0]}
            </div>
          )}

          {editable && (
            <div className="absolute bottom-0 right-0 bg-white rounded-full p-1.5 shadow-md border border-gray-200">
              {uploading ? (
                <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </div>
          )}
        </motion.div>

        {/* Popup options menu */}
        <AnimatePresence>
          {showMenu && (
            <>
              {/* Invisible backdrop to dismiss menu on outside tap */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowMenu(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.85, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85, y: -8 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                className="absolute z-50 mt-2 left-1/2 -translate-x-1/2 top-full bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden min-w-[210px]"
              >
                <button
                  onClick={openCamera}
                  className="flex items-center gap-3 w-full px-5 py-4 text-left font-bold text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors text-base border-b border-gray-100"
                >
                  <span className="text-xl">📷</span>
                  <span>Fer un selfie</span>
                </button>
                <button
                  onClick={openGallery}
                  className="flex items-center gap-3 w-full px-5 py-4 text-left font-bold text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors text-base"
                >
                  <span className="text-xl">🖼️</span>
                  <span>Escollir de la galeria</span>
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Hidden file input for gallery */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Hidden canvas used to capture selfie frames */}
      <canvas ref={canvasRef} className="hidden" />

      {error && <p className="text-red-500 text-xs">{error}</p>}
      {editable && !uploading && (
        <p className="text-gray-400 text-xs">Toca per canviar foto</p>
      )}

      {/* Fullscreen camera modal */}
      <AnimatePresence>
        {showCamera && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col bg-black"
          >
            {/* Video preview */}
            <div className="flex-1 relative overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
                onLoadedMetadata={(e) => (e.currentTarget as HTMLVideoElement).play()}
              />

              {/* Top bar */}
              <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-10">
                <span className="text-white font-black text-lg drop-shadow">Selfie</span>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={stopCamera}
                  className="bg-white/20 backdrop-blur-sm text-white font-bold px-4 py-2 rounded-full text-sm border border-white/30"
                >
                  Cancel·lar
                </motion.button>
              </div>
            </div>

            {/* Shutter button */}
            <div className="flex items-center justify-center py-8 bg-black/80">
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={capturePhoto}
                aria-label="Capturar"
                className="w-20 h-20 rounded-full bg-white border-4 border-gray-300 shadow-lg flex items-center justify-center"
                style={{ boxShadow: '0 0 0 6px rgba(255,255,255,0.3)' }}
              >
                <div className="w-14 h-14 rounded-full bg-white border-2 border-gray-200" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
