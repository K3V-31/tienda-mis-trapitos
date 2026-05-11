import { z } from 'zod'

export const customerFormSchema = z.object({
  name: z.string().trim().min(1, 'Ingresá un nombre').max(140, 'Máximo 140 caracteres'),
  phone: z.string().trim().optional(),
  email: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || z.email().safeParse(value).success, 'Ingresá un email válido'),
  address: z.string().trim().optional(),
})
