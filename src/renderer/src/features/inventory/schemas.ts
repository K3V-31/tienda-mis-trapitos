import { z } from 'zod'

export const stockEntrySchema = z.object({
  productId: z.string().trim().min(1, 'Seleccioná un producto para ingresar stock.'),
  quantity: z.string().trim().min(1, 'Indicá la cantidad que entra.'),
  note: z.string().trim().max(240, 'La referencia no puede superar los 240 caracteres.').optional().or(z.literal('')),
}).superRefine((value, context) => {
  const quantity = Number(value.quantity)

  if (!Number.isInteger(quantity) || quantity <= 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['quantity'],
      message: 'La cantidad de entrada debe ser un entero positivo.',
    })
  }
})

export const stockAdjustmentSchema = z.object({
  productId: z.string().trim().min(1, 'Seleccioná un producto para ajustar.'),
  delta: z.string().trim().min(1, 'Indicá el delta del ajuste.'),
  note: z.string().trim().min(1, 'Explicá el motivo del ajuste.').max(240, 'El motivo no puede superar los 240 caracteres.'),
}).superRefine((value, context) => {
  const delta = Number(value.delta)

  if (!Number.isInteger(delta) || delta === 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['delta'],
      message: 'El ajuste debe ser un entero distinto de cero.',
    })
  }
})
