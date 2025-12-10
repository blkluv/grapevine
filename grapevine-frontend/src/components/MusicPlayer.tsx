import { useRef, useState, useEffect } from 'react'
import { Play, Pause, SkipBack, SkipForward, StopCircle, Volume2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { trackEvent, AnalyticsEvents } from '@/lib/analytics'
import { useWallet } from '@/context/WalletContext'

// Neobrutalism styles
const styles = {
  container: 'bg-white p-3 select-none border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]',
  display: 'bg-accent-aqua border-4 border-black mb-3 p-3 relative h-20 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
  displayText: 'text-black font-mono font-bold',
  visualizer: 'h-10 bg-white border-4 border-black mb-3 flex items-end gap-1 px-2 pb-2 shadow-[inset_4px_4px_0px_0px_rgba(0,0,0,0.2)]',
  visualizerBar: 'w-full bg-black border-2 border-black transition-all duration-75',
  controlButton: 'w-8 h-8 bg-accent-orange border-4 border-black flex items-center justify-center hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
  volumeBar: 'w-20 h-3 bg-white border-3 border-black overflow-hidden shadow-[inset_2px_2px_0px_0px_rgba(0,0,0,0.3)]',
  volumeFill: 'h-full bg-black',
  iconColor: 'text-black',
  volumeIconColor: 'text-black',
}

interface MusicPlayerProps {
  className?: string
}

export function MusicPlayer({ className }: MusicPlayerProps) {
  const { address } = useWallet()
  const audioRef = useRef<HTMLAudioElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [frequencyData, setFrequencyData] = useState<number[]>(Array(40).fill(0))
  const [volume, setVolume] = useState(0.67)
  const volumeBarRef = useRef<HTMLDivElement>(null)

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPlaying) {
      interval = setInterval(() => {
        setTime((t) => t + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isPlaying])

  // Initialize Web Audio API (lazy - on first play)
  const initializeAudioContext = () => {
    if (audioContextRef.current) return
    if (!audioRef.current) return

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      audioContextRef.current = audioContext

      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 128
      analyser.smoothingTimeConstant = 0.7
      analyserRef.current = analyser

      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      dataArrayRef.current = dataArray

      const source = audioContext.createMediaElementSource(audioRef.current)
      source.connect(analyser)
      analyser.connect(audioContext.destination)
    } catch (error) {
      console.error('[MusicPlayer] Failed to initialize Web Audio API:', error)
    }
  }

  // Initialize audio element and cleanup on unmount
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
      audioRef.current.muted = false
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      audioContextRef.current?.close()
    }
  }, [])

  // Sync volume to audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [volume])

  // Animate frequency bars
  useEffect(() => {
    if (!isPlaying || !analyserRef.current || !dataArrayRef.current) {
      if (!isPlaying) {
        setFrequencyData(Array(40).fill(0))
      }
      return
    }

    const updateFrequencies = () => {
      if (!analyserRef.current || !dataArrayRef.current) return

      analyserRef.current.getByteFrequencyData(dataArrayRef.current)

      const barData = Array.from(dataArrayRef.current.slice(0, 40)).map((value) => {
        const normalized = (value / 255) * 100
        const minThreshold = 30
        const maxThreshold = 90
        const remapped = ((normalized - minThreshold) / (maxThreshold - minThreshold)) * 100
        return Math.max(0, Math.min(100, remapped))
      })

      setFrequencyData(barData)
      animationFrameRef.current = requestAnimationFrame(updateFrequencies)
    }

    updateFrequencies()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isPlaying])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const togglePlay = async () => {
    if (!audioRef.current) return

    try {
      if (!audioContextRef.current) {
        initializeAudioContext()
      }

      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume()
      }

      if (isPlaying) {
        audioRef.current.pause()
        trackEvent(AnalyticsEvents.MUSIC_PLAYER_PAUSE, {}, address)
      } else {
        await audioRef.current.play()
        trackEvent(AnalyticsEvents.MUSIC_PLAYER_PLAY, {}, address)
      }
      setIsPlaying(!isPlaying)
    } catch (error) {
      console.error('[MusicPlayer] Error toggling play:', error)
    }
  }

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
      setTime(0)
    }
  }

  const handleVolumeChange = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!volumeBarRef.current) return
    const rect = volumeBarRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const newVolume = Math.max(0, Math.min(1, x / rect.width))
    setVolume(newVolume)
  }

  const handleVolumeDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return // Only handle left mouse button
    handleVolumeChange(e)
  }

  return (
    <div className={cn(styles.container, className)}>
      {/* Display */}
      <div className={styles.display}>
        <div className={cn(styles.displayText, 'text-xs absolute top-1 left-1')}>
          {isPlaying ? 'PLAYING' : 'STOPPED'} 128kbps
        </div>
        <div className={cn(styles.displayText, 'text-xl absolute top-4 right-2 tracking-widest')}>
          {formatTime(time)}
        </div>
        <div className={cn(styles.displayText, 'text-sm absolute bottom-1 left-1 truncate w-full pr-16')}>
          PowerHitz 90s Radio
        </div>
      </div>

      {/* Visualizer */}
      <div className={styles.visualizer}>
        {frequencyData.map((value, i) => (
          <div
            key={i}
            className={styles.visualizerBar}
            style={{ height: `${Math.max(5, value)}%` }}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center">
        <div className="flex gap-1">
          <button className={styles.controlButton}>
            <SkipBack className={cn('w-3 h-3', styles.iconColor)} />
          </button>
          <button className={styles.controlButton} onClick={togglePlay}>
            {isPlaying ? (
              <Pause className={cn('w-3 h-3', styles.iconColor)} />
            ) : (
              <Play className={cn('w-3 h-3', styles.iconColor)} />
            )}
          </button>
          <button className={styles.controlButton} onClick={handleStop}>
            <StopCircle className={cn('w-3 h-3', styles.iconColor)} />
          </button>
          <button className={styles.controlButton}>
            <SkipForward className={cn('w-3 h-3', styles.iconColor)} />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <Volume2 className={cn('w-4 h-4', styles.volumeIconColor)} />
          <div
            ref={volumeBarRef}
            className={cn(styles.volumeBar, 'cursor-pointer')}
            onClick={handleVolumeChange}
            onMouseMove={handleVolumeDrag}
          >
            <div
              className={styles.volumeFill}
              style={{ width: `${volume * 100}%` }}
            />
          </div>
        </div>
      </div>

      <audio
        ref={audioRef}
        src="https://live.powerhitz.com/90sarea?aw_0_req.gdpr=true"
        crossOrigin="anonymous"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={(e) => console.error('[MusicPlayer] Audio element error:', e)}
      />
    </div>
  )
}
