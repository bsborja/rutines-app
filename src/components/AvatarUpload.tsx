'use client'

import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
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
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      setError('Selecciona una imatge vàlida')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('La imatge ha de ser menor de 5MB')
      return
    }

    setUploading(true)
    setError('')

    try {
      // Always use a fixed path so upsert replaces the existing file
      const path = `${profileId}/avatar`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })

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

  return (
    <div className="flex flex-col items-center gap-2">
      <motion.div
        whileTap={editable ? { scale: 0.95 } : {}}
        onClick={editable ? () => inputRef.current?.click() : undefined}
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

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {error && <p className="text-red-500 text-xs">{error}</p>}
      {editable && !uploading && (
        <p className="text-gray-400 text-xs">Toca per canviar foto</p>
      )}
    </div>
  )
}
