import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CodeLinear,
  CPULinear,
  RefreshLinear,
  FolderOpenLinear,
  MagicStick2Linear,
  Pulse2Linear,
  LayersLinear
} from 'solar-icon-set'
import antigravityLogo from '@/assets/antigravity.svg'
import type { AntigravityInfo } from '@/types/antigravity'

export function HomePage() {
  const navigate = useNavigate()
  const [info, setInfo] = useState<AntigravityInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.api?.antigravity?.getInfo().then((res) => {
      setInfo(res)
      setLoading(false)
    })
  }, [])

  return (
    <div className="min-h-screen w-full bg-neutral-950 text-neutral-100 p-8 select-none">
      {/* Header */}
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-900 border border-neutral-800 shadow-md">
              <img src={antigravityLogo} alt="Antigravity" className="h-6 w-6 object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Anti-Checker Dashboard
                <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs">
                  Hoạt động
                </Badge>
              </h1>
              <p className="text-xs text-neutral-400">
                Quản lý & kiểm tra môi trường Antigravity nội bộ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/')}
              className="border-neutral-800 bg-neutral-900 text-xs hover:bg-neutral-800"
            >
              <RefreshLinear size={14} className="mr-1.5" />
              Kiểm tra cập nhật lại
            </Button>
          </div>
        </div>

        {/* Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-neutral-800 bg-neutral-900/60 backdrop-blur">
            <CardHeader className="pb-3">
              <CardDescription className="text-neutral-400 text-xs flex items-center gap-1.5">
                <CPULinear size={16} className="text-blue-400" /> Trạng thái Antigravity
              </CardDescription>
              <CardTitle className="text-lg text-white font-semibold flex items-center gap-2">
                {loading ? 'Đang tải...' : info?.installed ? 'Đã cài đặt nội bộ' : 'Chưa cài đặt'}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-neutral-400 space-y-1">
              <div className="flex justify-between">
                <span>Phiên bản:</span>
                <span className="font-mono text-blue-400 font-medium">
                  {info?.version ? `v${info.version}` : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Môi trường:</span>
                <span className="text-emerald-400 font-medium">Dedicated Local</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-neutral-800 bg-neutral-900/60 backdrop-blur">
            <CardHeader className="pb-3">
              <CardDescription className="text-neutral-400 text-xs flex items-center gap-1.5">
                <CodeLinear size={16} className="text-indigo-400" /> Thư mục thực thi (Bin)
              </CardDescription>
              <CardTitle className="text-sm text-neutral-200 font-mono font-medium truncate" title={info?.binaryPath}>
                %LOCALAPPDATA%\anti-checker\bin
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-neutral-400 space-y-1">
              <div className="flex justify-between items-center">
                <span>Thực thi:</span>
                <span className="font-mono text-neutral-300">agy.exe</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Quyền hạn:</span>
                <span className="text-neutral-400">User Mode (No Admin required)</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-neutral-800 bg-neutral-900/60 backdrop-blur">
            <CardHeader className="pb-3">
              <CardDescription className="text-neutral-400 text-xs flex items-center gap-1.5">
                <Pulse2Linear size={16} className="text-emerald-400" /> Cập nhật tự động
              </CardDescription>
              <CardTitle className="text-lg text-white font-semibold flex items-center gap-2">
                Kích hoạt (Silent)
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-neutral-400 space-y-1">
              <div className="flex justify-between">
                <span>Cơ chế:</span>
                <span className="text-neutral-300">Tự kiểm tra lúc khởi động</span>
              </div>
              <div className="flex justify-between">
                <span>Hỏi xác nhận:</span>
                <span className="text-amber-400">Không (Tự động tải & cập nhật)</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Work Area */}
        <Card className="border-neutral-800 bg-neutral-900/40 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-base text-white flex items-center gap-2">
              <MagicStick2Linear size={18} className="text-blue-400" />
              Sẵn sàng kết nối công cụ kiểm tra
            </CardTitle>
            <CardDescription className="text-xs text-neutral-400">
              Antigravity CLI nội bộ đã được cấu hình độc lập hoàn toàn với môi trường bên ngoài máy.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-neutral-800 bg-neutral-950/70 p-4 font-mono text-xs text-neutral-300 space-y-2">
              <div className="text-neutral-500"># Kiểm tra lệnh CLI nội bộ:</div>
              <div className="text-blue-400">
                &quot;{info?.binaryPath || '%LOCALAPPDATA%\\anti-checker\\bin\\agy.exe'}&quot; --version
              </div>
              <div className="text-neutral-400 text-[11px]">
                Mọi tác vụ agent và quota check đều có thể gọi trực tiếp thông qua IPC hoặc instance nội bộ này.
              </div>
            </div>

            <div className="flex gap-3">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white text-xs">
                <LayersLinear size={14} className="mr-1.5" />
                Khởi tạo tác vụ mới
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-neutral-800 text-xs hover:bg-neutral-800"
                onClick={() => {
                  if (info?.binDir) {
                    window.electron?.ipcRenderer?.send('ping')
                  }
                }}
              >
                <FolderOpenLinear size={14} className="mr-1.5" />
                Mở thư mục bin
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
export default HomePage
