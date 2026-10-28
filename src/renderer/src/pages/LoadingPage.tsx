import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import {
  RestartLinear,
  CheckCircleLinear,
  DangerCircleLinear,
  CloudDownloadLinear,
  RefreshLinear,
  CPULinear
} from 'solar-icon-set'
import antigravityLogo from '@/assets/antigravity.svg'
import type { AntigravityProgress } from '@/types/antigravity'

gsap.registerPlugin(useGSAP)

export function LoadingPage() {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const logoRef = useRef<HTMLDivElement>(null)

  const [progress, setProgress] = useState<number>(10)
  const [step, setStep] = useState<AntigravityProgress['step']>('checking_env')
  const [message, setMessage] = useState<string>('Khởi tạo môi trường Antigravity...')
  const [speedText, setSpeedText] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)

  // GSAP animation cho logo Antigravity (hiệu ứng float và breathing nhẹ)
  useGSAP(
    () => {
      if (logoRef.current) {
        gsap.to(logoRef.current, {
          y: -6,
          duration: 1.8,
          repeat: -1,
          yoyo: true,
          ease: 'power1.inOut'
        })
      }
    },
    { scope: containerRef }
  )

  const startCheckAndUpdate = async () => {
    setError(null)
    setIsRetrying(false)
    setProgress(15)
    setStep('checking_env')
    setMessage('Đang kiểm tra môi trường...')
    setSpeedText(null)

    try {
      // Đăng ký nhận progress updates từ Main process
      const removeListener = window.api?.antigravity?.onProgress((prog) => {
        setStep(prog.step)
        setMessage(prog.message)
        if (typeof prog.percent === 'number') {
          setProgress(prog.percent)
        }
        if (prog.speedText) {
          setSpeedText(prog.speedText)
        }
        if (prog.error) {
          setError(prog.error)
        }
      })

      // Kích hoạt tiến trình tự động kiểm tra và cập nhật/cài đặt
      const result = await window.api?.antigravity?.checkAndUpdate()

      if (removeListener) removeListener()

      if (result?.success) {
        setStep('ready')
        setProgress(100)
        setMessage(`Môi trường Antigravity v${result.version || '1.4.9'} đã sẵn sàng!`)
        setSpeedText(null)

        // Fade-out nhẹ và chuyển trang
        gsap.to(containerRef.current, {
          opacity: 0,
          duration: 0.6,
          delay: 0.8,
          onComplete: () => {
            navigate('/home')
          }
        })
      } else {
        setError(result?.error || 'Không thể thiết lập môi trường Antigravity')
        setStep('error')
      }
    } catch (err: any) {
      setError(err?.message || 'Lỗi kết nối IPC với tiến trình chính')
      setStep('error')
    }
  }

  useEffect(() => {
    startCheckAndUpdate()
  }, [])

  // Icon Solar tương ứng với từng trạng thái
  const getStepIcon = () => {
    switch (step) {
      case 'downloading':
      case 'updating':
        return <CloudDownloadLinear size={16} className="animate-bounce text-blue-400 shrink-0" />
      case 'verifying':
      case 'installing':
        return <RefreshLinear size={16} className="animate-spin text-amber-400 shrink-0" />
      case 'ready':
      case 'up_to_date':
        return <CheckCircleLinear size={16} className="text-emerald-400 shrink-0" />
      case 'error':
        return <DangerCircleLinear size={16} className="text-rose-400 shrink-0" />
      default:
        return <CPULinear size={16} className="text-neutral-400 shrink-0" />
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative flex h-screen w-screen flex-col items-center justify-center bg-black p-6 select-none overflow-hidden"
    >
      <div className="flex w-full max-w-sm flex-col items-center">
        {/* Antigravity Logo ở trên */}
        <div ref={logoRef} className="mb-10 flex items-center justify-center">
          <img
            src={antigravityLogo}
            alt="Antigravity"
            className="h-20 w-20 object-contain drop-shadow-[0_0_24px_rgba(59,130,246,0.35)]"
          />
        </div>

        {/* Khối Process & Text trên 2 đầu */}
        <div className="w-full space-y-2.5">
          {/* Text trên 2 đầu thanh process */}
          <div className="flex items-center justify-between text-xs font-medium">
            <div className="flex items-center gap-1.5 text-neutral-300 truncate max-w-[270px]">
              {getStepIcon()}
              <span className="truncate">{message}</span>
            </div>
            <span className="font-mono text-neutral-400 text-xs shrink-0 pl-2">
              {error ? 'Lỗi' : `${progress}%`}
            </span>
          </div>

          {/* Thanh Progress bar */}
          <Progress value={progress} className="h-1.5 w-full bg-neutral-900 border border-neutral-800/80" />

          {/* Dưới thanh process: Tốc độ tải hoặc thông tin lỗi */}
          <div className="min-h-[22px] text-[11px] font-mono text-neutral-400">
            {speedText && !error && (
              <div className="flex items-center justify-between animate-fadeIn text-neutral-400">
                <span>{speedText}</span>
                <span className="text-blue-400/90 text-[10px]">Tự động cập nhật</span>
              </div>
            )}

            {error && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-rose-400 truncate max-w-[240px]">{error}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsRetrying(true)
                    startCheckAndUpdate()
                  }}
                  disabled={isRetrying}
                  className="h-6 px-2 text-[11px] text-rose-300 hover:text-white hover:bg-rose-950/50"
                >
                  <RestartLinear size={12} className={`mr-1 ${isRetrying ? 'animate-spin' : ''}`} />
                  Thử lại
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
export default LoadingPage
