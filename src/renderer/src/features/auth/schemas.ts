import { z } from 'zod'

export const LoginSchema = z.object({
  username: z.string().trim().min(1, 'Ingresá tu usuario'),
  password: z.string().min(1, 'Ingresá tu contraseña'),
})

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Ingresá tu contraseña actual'),
    newPassword: z.string().min(8, 'La nueva contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z.string().min(8, 'Confirmá la nueva contraseña'),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: 'Las contraseñas nuevas no coinciden',
    path: ['confirmPassword'],
  })

export type LoginFormValues = z.infer<typeof LoginSchema>
export type ChangePasswordFormValues = z.infer<typeof ChangePasswordSchema>
