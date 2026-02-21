export interface Participant {
  id: string
  username: string
  comment: string
  timestamp: Date
  profilePic?: string
}

export interface GiveawaySettings {
  postUrl: string
  numberOfWinners: number
  filterDuplicates: boolean
  requireMentions: number
  excludeAccounts: string[]
  minCommentLength: number
  keywordFilter: string[]
  backupWinners: number
  accentColor: string
  logoDataUrl: string | null
}

export interface GiveawayResult {
  id: string
  postUrl: string
  winners: Participant[]
  totalParticipants: number
  createdAt: Date
  settings: GiveawaySettings
}

export interface PaymentInfo {
  paymentId: string
  status: "approved" | "pending" | "failed"
  amount: number
}
