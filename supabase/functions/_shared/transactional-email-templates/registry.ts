/// <reference types="npm:@types/react@18.3.1" />

import type * as React from 'npm:react@18.3.1'

import { template as dailyOpsDigest } from './daily-ops-digest.tsx'
import { template as doctorVisitRecorded } from './doctor-visit-recorded.tsx'
import { template as doctorBankAdvice } from './doctor-bank-advice.tsx'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  to?: string
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  'daily-ops-digest': dailyOpsDigest,
  'doctor-visit-recorded': doctorVisitRecorded,
  'doctor-bank-advice': doctorBankAdvice,
}
