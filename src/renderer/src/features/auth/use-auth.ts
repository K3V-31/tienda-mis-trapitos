import { useAuth } from '@/shared/auth-context'

export function useSession() {
  return useAuth()
}
