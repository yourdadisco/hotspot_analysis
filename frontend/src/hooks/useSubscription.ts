import { useQuery } from '@tanstack/react-query'
import { subscriptionApi } from '../services/api'

export interface SubscriptionInfo {
  tier: 'free' | 'personal' | 'team'
  label: string
  status: string
  daily_limit: number
  history_days: number
  used_today: number
  period_start: string | null
  period_end: string | null
  cancel_at_period_end: boolean
  team_seats: number
}

const FEATURES: Record<string, string[]> = {
  auto_update: ['personal', 'team'],
  websocket: ['personal', 'team'],
  daily_digest: ['personal', 'team'],
  keyword_alert: ['personal', 'team'],
  historical_1y: ['personal', 'team'],
  team_collab: ['team'],
  custom_source: ['team'],
}

export function useSubscription(userId: string) {
  const { data, isLoading, refetch } = useQuery<SubscriptionInfo>({
    queryKey: ['subscription', userId],
    queryFn: () => subscriptionApi.getSubscription(userId) as Promise<any>,
    enabled: !!userId,
    staleTime: 60000,
  })

  const sub = data || { tier: 'free', label: '免费版', status: 'active', daily_limit: 30, history_days: 3, used_today: 0, period_start: null, period_end: null, cancel_at_period_end: false, team_seats: 1 }
  const tier = sub.tier

  return {
    subscription: sub,
    isLoading,
    refetch,
    tier,
    isFree: tier === 'free',
    isPersonal: tier === 'personal' || tier === 'team',
    isTeam: tier === 'team',
    canUse: (feature: string) => {
      const allowed = FEATURES[feature]
      return allowed ? allowed.includes(tier) : false
    },
    usagePercent: sub.daily_limit > 0 ? Math.min(100, Math.round((sub.used_today / sub.daily_limit) * 100)) : 0,
  }
}
