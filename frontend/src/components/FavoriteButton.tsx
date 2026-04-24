import React from 'react'
import { Heart } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { userActionsApi } from '../services/api'
import { useToastStore } from '../stores/toastStore'

interface FavoriteButtonProps {
  hotspotId: string
  isFavorite: boolean
  size?: 'sm' | 'md'
}

const FavoriteButton: React.FC<FavoriteButtonProps> = ({ hotspotId, isFavorite, size = 'sm' }) => {
  const addToast = useToastStore((s) => s.addToast)
  const queryClient = useQueryClient()
  const userId = localStorage.getItem('user_id') || ''

  const mutation = useMutation({
    mutationFn: () => userActionsApi.toggleFavorite(userId, hotspotId),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['hotspots'] })
      queryClient.invalidateQueries({ queryKey: ['hotspot', hotspotId] })
      queryClient.invalidateQueries({ queryKey: ['favorites'] })
      addToast(data.is_favorite ? '已收藏' : '已取消收藏', 'success')
    },
    onError: () => {
      addToast('操作失败，请重试', 'error')
    },
  })

  const sizeClass = size === 'sm' ? 'w-5 h-5' : 'w-6 h-6'

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        if (!userId) {
          addToast('请先登录', 'warning')
          return
        }
        mutation.mutate()
      }}
      disabled={mutation.isPending}
      className={`p-1.5 rounded-full transition-colors ${
        isFavorite
          ? 'text-red-500 hover:bg-red-50'
          : 'text-gray-400 hover:text-red-400 hover:bg-gray-100'
      } ${mutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
      title={isFavorite ? '取消收藏' : '收藏'}
    >
      <Heart
        size={size === 'sm' ? 16 : 20}
        className={sizeClass}
        fill={isFavorite ? 'currentColor' : 'none'}
      />
    </button>
  )
}

export default FavoriteButton
