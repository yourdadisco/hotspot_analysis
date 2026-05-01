import React, { useState, useEffect, useCallback } from 'react'
import { BookOpen } from 'lucide-react'

interface TutorialPromptProps {
  userId: string
  onDismiss: () => void
  onOpenTutorial: () => void
}

const TutorialPrompt: React.FC<TutorialPromptProps> = ({ userId, onDismiss, onOpenTutorial }) => {
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const [btnRect, setBtnRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    const btn = document.getElementById('tutorial-btn')
    if (btn) {
      setBtnRect(btn.getBoundingClientRect())
    }
  }, [])

  const handleClose = useCallback((persist: boolean) => {
    if (persist && userId) {
      localStorage.setItem(`tutorial_dismissed_${userId}`, 'true')
    }
    onDismiss()
  }, [userId, onDismiss])

  const handleOpenTutorial = () => {
    handleClose(dontShowAgain)
    onOpenTutorial()
  }

  if (!btnRect) return null

  // 箭头指向按钮
  const arrowLeft = btnRect.left + btnRect.width
  const arrowTop = btnRect.top + btnRect.height / 2

  return (
    <div className="fixed inset-0 z-[100]">
      {/* 半透明遮罩 */}
      <div className="absolute inset-0 bg-black/30" onClick={() => handleClose(false)} />

      {/* 箭头 */}
      <div
        className="absolute w-3 h-3 bg-white border-l border-t border-gray-200 -translate-x-1/2 -translate-y-1/2 rotate-[-45deg] z-10"
        style={{ left: arrowLeft, top: arrowTop }}
      />

      {/* 提示卡 */}
      <div
        className="absolute bg-white rounded-xl shadow-2xl p-5 z-20 border border-gray-200"
        style={{
          left: arrowLeft + 12,
          top: arrowTop - 70,
        }}
      >
        <div className="flex items-start space-x-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <BookOpen className="text-blue-600" size={22} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-base">首次使用？</h3>
            <p className="text-gray-600 text-sm mt-1 max-w-[260px] leading-relaxed">
              点击左侧的<strong>使用教程</strong>，快速了解如何配置业务、接入模型和智能追踪热点。
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <label className="flex items-center space-x-2 text-sm text-gray-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>不再提示</span>
          </label>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleClose(false)}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-50 transition-colors"
            >
              稍后
            </button>
            <button
              onClick={handleOpenTutorial}
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              查看教程
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TutorialPrompt
