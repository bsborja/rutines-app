'use client'

// Synthesized sounds using Web Audio API - no external audio files needed

let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext()
  }
  return audioContext
}

// Play a note
function playNote(
  frequency: number,
  duration: number,
  startTime: number,
  gain: number = 0.3,
  type: OscillatorType = 'sine',
): void {
  const ctx = getAudioContext()
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)

  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, startTime)

  gainNode.gain.setValueAtTime(0, startTime)
  gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.01)
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration)

  oscillator.start(startTime)
  oscillator.stop(startTime + duration)
}

// Cheerful ascending chime for "Bé" (good)
export function playSuccessSound(): void {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    // C5, E5, G5, C6 - major chord arpeggio
    const notes = [523.25, 659.25, 783.99, 1046.5]
    notes.forEach((freq, i) => {
      playNote(freq, 0.4, now + i * 0.12, 0.25)
    })

    // Add a sparkle on top
    playNote(2093, 0.3, now + 0.5, 0.15)
  } catch {
    // Browser may block AudioContext until user interaction - silent fallback
  }
}

// Soft neutral sound for "Regular" (ok)
export function playOkSound(): void {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime
    playNote(440, 0.3, now, 0.2)
    playNote(523.25, 0.3, now + 0.15, 0.15)
  } catch {
    // silent fallback
  }
}

// Low disappointed sound for "Malament" (bad)
export function playBadSound(): void {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime
    playNote(220, 0.4, now, 0.2, 'sawtooth')
    playNote(196, 0.5, now + 0.1, 0.15, 'sawtooth')
  } catch {
    // silent fallback
  }
}

// Extra celebratory fanfare for Julia mode
export function playSuperSuccessSound(): void {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    // Happy fanfare sequence
    const melody = [
      { freq: 523.25, time: 0, dur: 0.15 },
      { freq: 659.25, time: 0.15, dur: 0.15 },
      { freq: 783.99, time: 0.3, dur: 0.15 },
      { freq: 1046.5, time: 0.45, dur: 0.3 },
      { freq: 1046.5, time: 0.75, dur: 0.15 },
      { freq: 1174.66, time: 0.9, dur: 0.3 },
    ]

    melody.forEach(({ freq, time, dur }) => {
      playNote(freq, dur, now + time, 0.3)
    })

    // Harmony
    const harmony = [261.63, 329.63, 392, 523.25]
    harmony.forEach((freq, i) => {
      playNote(freq, 0.6, now + 0.45 + i * 0.05, 0.1)
    })
  } catch {
    // silent fallback
  }
}

// Level up sound
export function playLevelUpSound(): void {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51]
    notes.forEach((freq, i) => {
      playNote(freq, 0.5, now + i * 0.1, 0.2)
    })
    playNote(2093, 0.8, now + 0.6, 0.25)
  } catch {
    // silent fallback
  }
}

// Badge earned sound
export function playBadgeSound(): void {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime
    playNote(1046.5, 0.2, now, 0.3)
    playNote(1318.51, 0.2, now + 0.15, 0.3)
    playNote(1568, 0.4, now + 0.3, 0.3)
  } catch {
    // silent fallback
  }
}

// Resume AudioContext if suspended (required after user gesture)
export function resumeAudio(): void {
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume()
  }
}
