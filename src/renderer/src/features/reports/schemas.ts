import { z } from 'zod'

export const customReportRangeSchema = z
  .object({
    startDate: z.string().min(1, 'La fecha inicial es obligatoria.'),
    endDate: z.string().min(1, 'La fecha final es obligatoria.'),
  })
  .refine((value) => value.endDate >= value.startDate, {
    message: 'La fecha final no puede ser anterior a la inicial.',
    path: ['endDate'],
  })
