import { Button } from '@/components/ui/button'

export default function App() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Tienda Trapitos</h1>
        <p className="text-muted-foreground">Todo listo para arrancar.</p>
        <Button>Comenzar</Button>
      </div>
    </main>
  )
}
