# Arquitectura — Mis Trapitos POS (Electron)

Detalle técnico de cómo se estructura la **aplicación de escritorio Electron**, cómo se comunican sus dos procesos y cómo se organiza el código. La app es 100% local, sin servidor, sin SSR, sin red.

---

## 1. Topología de procesos

Electron tiene dos procesos principales. La app respeta esa división estricta:

```
┌──────────────────────────────────────────────────────────────┐
│                          MAIN process                         │
│                       (Node.js, único)                        │
│                                                               │
│  ┌─────────────────┐  ┌──────────────┐  ┌──────────────────┐│
│  │  app lifecycle  │  │  IPC router  │  │  Domain handlers ││
│  │  - ready        │  │  (ipcMain)   │  │  - auth          ││
│  │  - window       │  │              │  │  - products      ││
│  │  - quit         │  │              │  │  - sales         ││
│  └─────────────────┘  └──────────────┘  │  - customers     ││
│                                          │  - suppliers     ││
│                                          │  - offers        ││
│                                          │  - audit         ││
│                                          │  - backup        ││
│                                          └────────┬─────────┘│
│                                                   │           │
│                                          ┌────────▼─────────┐│
│                                          │   Drizzle ORM    ││
│                                          │   + better-sqlite3││
│                                          └────────┬─────────┘│
│                                                   │           │
│                                          ┌────────▼─────────┐│
│                                          │   app.db file    ││
│                                          │  (userData/)     ││
│                                          └──────────────────┘│
└──────────────────────────────────────────────────────────────┘
                              ▲
                              │  IPC (contextBridge)
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                    PRELOAD (sandboxed)                        │
│            Expone window.api con tipos TypeScript             │
└──────────────────────────────────────────────────────────────┘
                              ▲
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                   RENDERER process                            │
│                (Chromium, React SPA)                          │
│                                                               │
│  ┌────────────┐  ┌──────────────┐  ┌───────────────────┐    │
│  │   React    │  │  React       │  │   shadcn/ui       │    │
│  │   19       │  │  Router v7   │  │   + Tailwind v4   │    │
│  └────────────┘  └──────────────┘  └───────────────────┘    │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │   Custom hooks → window.api.*()  +  Zod (validación)  │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

**Reglas duras:**
- El renderer **nunca** importa `better-sqlite3`, `drizzle`, ni nada de Node. Todo pasa por IPC.
- El main **nunca** sabe de React. Solo expone handlers.
- El preload solo declara qué métodos existen; no implementa lógica.

---

## 2. Estructura de carpetas

La estructura sigue la convención de **electron-vite**: `src/main/`, `src/preload/` y `src/renderer/` son las tres raíces del build. El renderer es la SPA React; todo lo que toca Node o SQLite vive en main.

```
tienda-trapitos/
├── src/
│   ├── main/                        # Main process — Node.js, accede a todo
│   │   ├── index.ts                 # entry: app.whenReady + createWindow
│   │   ├── window.ts                # configuración de BrowserWindow
│   │   ├── ipc/
│   │   │   ├── index.ts             # registra todos los handlers al arrancar
│   │   │   ├── auth.ts
│   │   │   ├── products.ts
│   │   │   ├── customers.ts
│   │   │   ├── suppliers.ts
│   │   │   ├── offers.ts
│   │   │   ├── sales.ts
│   │   │   ├── inventory.ts
│   │   │   ├── audit.ts
│   │   │   └── backup.ts
│   │   ├── db/
│   │   │   ├── client.ts            # better-sqlite3 + drizzle init
│   │   │   ├── schema.ts            # tablas Drizzle (fuente de verdad del schema)
│   │   │   ├── migrate.ts           # corre migraciones al arrancar
│   │   │   └── seed.ts              # crea el admin inicial si la BD está vacía
│   │   ├── services/                # lógica de negocio (sin IPC, pura)
│   │   │   ├── auth.service.ts
│   │   │   ├── sales.service.ts     # transacción atómica de checkout
│   │   │   ├── inventory.service.ts
│   │   │   └── audit.service.ts
│   │   └── session.ts               # singleton de sesión en memoria
│   │
│   ├── preload/
│   │   └── index.ts                 # contextBridge → expone window.api tipado
│   │
│   └── renderer/
│       ├── index.html               # entry HTML que carga /src/main.tsx
│       └── src/                     # SPA React (Vite lo procesa desde acá)
│           ├── main.tsx             # ReactDOM.createRoot
│           ├── App.tsx              # <BrowserRouter> + rutas + providers
│           ├── index.css            # @import "tailwindcss" + shadcn CSS vars
│           ├── lib/
│           │   └── utils.ts         # cn() (clsx + tailwind-merge)
│           ├── components/
│           │   └── ui/              # componentes shadcn (auto-generados con CLI)
│           ├── pages/               # un archivo/carpeta por pantalla
│           │   ├── login/
│           │   │   └── LoginPage.tsx
│           │   ├── pos/
│           │   │   └── PosPage.tsx
│           │   ├── products/
│           │   │   ├── ProductsPage.tsx
│           │   │   └── ProductFormPage.tsx
│           │   ├── customers/
│           │   ├── suppliers/
│           │   ├── offers/
│           │   ├── inventory/
│           │   ├── reports/
│           │   ├── audit/
│           │   └── users/
│           ├── features/            # hooks y schemas Zod por dominio
│           │   ├── auth/
│           │   │   ├── use-auth.ts          # hook que llama window.api.auth.*
│           │   │   └── schemas.ts           # Zod: LoginInput, etc.
│           │   ├── products/
│           │   │   ├── use-products.ts
│           │   │   └── schemas.ts
│           │   ├── sales/
│           │   │   ├── use-cart.ts          # estado local del carrito
│           │   │   └── schemas.ts
│           │   └── ...
│           └── shared/
│               ├── auth-context.tsx         # React Context de sesión activa
│               ├── layout.tsx               # shell con sidebar según rol
│               └── protected-route.tsx      # redirige a /login si no hay sesión
│
├── src/shared/                      # tipos y constantes compartidos main ↔ renderer
│   ├── ipc-channels.ts              # constantes de canales ('products:list', etc.)
│   └── types.ts                     # tipos de dominio sin deps de Node ni DOM
│
├── drizzle/                         # migraciones SQL generadas por drizzle-kit
├── out/                             # build output de electron-vite (no commitear)
├── docs/
├── electron.vite.config.ts          # config unificada main + preload + renderer
├── tsconfig.json
├── components.json                  # config de shadcn/ui
└── package.json
```

**Reglas de la estructura:**
- `src/main/` y `src/preload/` tienen acceso a Node.js. `src/renderer/src/` **no**.
- `src/shared/` solo puede contener TypeScript puro: tipos, enums, constantes. Sin `import` de Node ni de `electron`. Tanto main como renderer lo importan con paths relativos.
- Los componentes shadcn van siempre en `src/renderer/src/components/ui/` y se agregan con `npx shadcn@latest add <nombre>`.
- `features/` contiene la lógica de cada módulo de negocio: hooks que llaman a `window.api`, schemas Zod para validar formularios en el renderer.

---

## 3. Patrón de IPC

### 3.1 Definición de canales

Constantes en `src/shared/ipc-channels.ts`:

```ts
export const IPC = {
  auth: {
    login: 'auth:login',
    logout: 'auth:logout',
    currentUser: 'auth:current-user',
    changePassword: 'auth:change-password',
  },
  products: {
    list: 'products:list',
    get: 'products:get',
    create: 'products:create',
    update: 'products:update',
    deactivate: 'products:deactivate',
  },
  sales: {
    checkout: 'sales:checkout',
    list: 'sales:list',
    get: 'sales:get',
  },
  // ...
} as const;
```

### 3.2 Handlers en main

Convención: cada handler valida con Zod, ejecuta el service y devuelve `{ ok: true, data }` o `{ ok: false, error }`. Nunca lanza excepciones a través de IPC.

```ts
// src/main/ipc/products.ts
import { ipcMain } from 'electron';
import { z } from 'zod';
import { IPC } from '../../shared/ipc-channels';
import { productsService } from '../services/products.service';
import { requireAuth, requireRole } from '../session';

const CreateInput = z.object({
  name: z.string().min(1),
  price: z.number().positive(),
  // ...
});

export function registerProductHandlers() {
  ipcMain.handle(IPC.products.create, async (_e, raw) => {
    const user = requireAuth();
    requireRole(user, ['admin', 'stock']);
    const input = CreateInput.parse(raw);
    const product = await productsService.create(input, user.id);
    return { ok: true, data: product };
  });
  // ...
}
```

### 3.3 Preload tipado

```ts
// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '../shared/ipc-channels';

const api = {
  auth: {
    login: (input) => ipcRenderer.invoke(IPC.auth.login, input),
    logout: () => ipcRenderer.invoke(IPC.auth.logout),
    currentUser: () => ipcRenderer.invoke(IPC.auth.currentUser),
  },
  products: {
    list: (filters) => ipcRenderer.invoke(IPC.products.list, filters),
    create: (input) => ipcRenderer.invoke(IPC.products.create, input),
    // ...
  },
  // ...
};

contextBridge.exposeInMainWorld('api', api);

// Tipo global para el renderer
export type Api = typeof api;
declare global { interface Window { api: Api } }
```

### 3.4 Uso en renderer (custom hooks)

El renderer llama a `window.api.*` directamente desde custom hooks. No hay capa de cache extra — SQLite es local y síncrono, la latencia es despreciable.

```ts
// src/renderer/src/features/products/use-products.ts
import { useState, useEffect } from 'react';

export function useProducts(filters?: ProductFilters) {
  const [data, setData] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    window.api.products.list(filters)
      .then(res => {
        if (!res.ok) throw new Error(res.error);
        setData(res.data);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [JSON.stringify(filters)]);

  return { data, loading, error };
}
```

Las mutaciones (crear, editar) llaman a `window.api.*` directamente y luego re-ejecutan el hook de lista:

```ts
async function createProduct(input: CreateProductInput) {
  const res = await window.api.products.create(input);
  if (!res.ok) throw new Error(res.error);
  return res.data;
}
```

La validación de formularios del renderer usa **Zod** para parsear antes de enviar al main:

```ts
// src/renderer/src/features/products/schemas.ts
import { z } from 'zod';

export const CreateProductSchema = z.object({
  name: z.string().min(1),
  price: z.number().positive(),
  categoryId: z.number().int(),
  stock: z.number().int().min(0),
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
```

---

## 4. Sesión y autorización

- La sesión vive en memoria del **main process** (`src/main/session.ts`), como un singleton: `currentUser: User | null`.
- Tras `auth:login` exitoso, se setea; tras `auth:logout` o cierre de ventana, se limpia.
- Cada handler crítico llama `requireAuth()` y opcionalmente `requireRole(['admin'])`. Si no se cumple, devuelve `{ ok: false, error: 'unauthorized' }`.
- El renderer **no** mantiene la sesión; consulta `auth:currentUser` al arrancar y al cambiar de ruta protegida.

**Por qué no JWT/cookies:** no hay servidor ni clientes remotos. La app es local mono-usuario por proceso y la PC es la frontera de seguridad. JWT serviría para arquitecturas cliente-servidor, acá no aplica.

---

## 5. Servicio de auditoría

Patrón para no repetir código en cada handler:

```ts
// src/main/services/audit.service.ts
export async function logAudit(input: {
  userId: number;
  action: string;       // 'product.create', 'sale.checkout'
  entity: string;       // 'product', 'sale'
  entityId?: number;
  payload?: unknown;
}) {
  await db.insert(auditLog).values({
    userId: input.userId,
    action: input.action,
    entity: input.entity,
    entityId: input.entityId ?? null,
    payload: input.payload ? JSON.stringify(input.payload) : null,
  });
}
```

Cada service que muta estado llama `logAudit` al final, dentro de la misma transacción cuando aplique.

---

## 6. Transacciones críticas

### 6.1 Checkout de venta

Toda la operación de cobro es **una sola transacción SQLite**. Si algo falla, nada se persiste.

```ts
// src/main/services/sales.service.ts
export function checkout(input, user) {
  return db.transaction((tx) => {
    // 1. Re-validar stock con lock
    for (const item of input.items) {
      const product = tx.select().from(products).where(eq(products.id, item.productId)).get();
      if (!product || product.stock < item.quantity) {
        throw new Error('insufficient_stock');
      }
    }

    // 2. Crear sale
    const sale = tx.insert(sales).values({ ... }).returning().get();

    // 3. Crear sale_items
    tx.insert(saleItems).values(input.items.map(...)).run();

    // 4. Crear stock_movements
    tx.insert(stockMovements).values(input.items.map(item => ({
      productId: item.productId,
      userId: user.id,
      delta: -item.quantity,
      reason: 'sale',
      referenceId: sale.id,
    }))).run();

    // 5. Decrementar products.stock
    for (const item of input.items) {
      tx.update(products)
        .set({ stock: sql`stock - ${item.quantity}` })
        .where(eq(products.id, item.productId))
        .run();
    }

    // 6. Audit log
    tx.insert(auditLog).values({ ... }).run();

    return sale;
  });
}
```

`better-sqlite3` es síncrono → la transacción es trivial y segura.

---

## 7. Build y empaquetado

### 7.1 Scripts de package.json

```json
{
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "start": "electron-vite preview",
    "dist": "electron-builder",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate"
  }
}
```

`electron-vite` corre main + preload + renderer en un solo proceso con HMR en el renderer. El build produce `out/main/`, `out/preload/` y `out/renderer/`; electron-builder empaqueta desde ahí.

### 7.2 electron-builder.yml

```yaml
appId: com.mistrapitos.pos
productName: Mis Trapitos POS
directories:
  output: dist-electron
files:
  - out/**/*
  - drizzle/**/*
win:
  target: nsis
  artifactName: ${productName}-${version}-setup.${ext}
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
```

### 7.3 Recompilación nativa

`better-sqlite3` es módulo nativo. Tras instalar dependencias:

```bash
npx electron-rebuild -f -w better-sqlite3
```

Configurar `postinstall` script para automatizarlo.

---

## 8. Migraciones de BD

- Drizzle genera migraciones en `drizzle/` (ya está configurado).
- Al arrancar el main, se ejecutan las migraciones pendientes contra `userData/app.db`:

```ts
// src/main/db/migrate.ts
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db } from './client';
import path from 'path';
import { app } from 'electron';

export function runMigrations() {
  const migrationsFolder = app.isPackaged
    ? path.join(process.resourcesPath, 'drizzle')
    : path.join(process.cwd(), 'drizzle');
  migrate(db, { migrationsFolder });
}
```

Si las migraciones fallan, la app muestra una pantalla de error y ofrece importar un backup.

---

## 9. Logging y errores

- En main: log a archivo en `userData/logs/app.log` con rotación simple.
- En renderer: errores no capturados se loguean vía IPC al main.
- Los errores que llegan al usuario son mensajes amigables; los detalles van al log.

---

## 10. Decisiones técnicas adoptadas

| Área | Decisión | Justificación |
|------|----------|---------------|
| Build / dev | **electron-vite** | Un solo comando para main + preload + renderer con HMR |
| Routing del renderer | **React Router v7** | SPA estándar, sin file-based routing (estructura manual en `pages/`) |
| Estado servidor | **Custom hooks** (`useState` + `useEffect`) | SQLite local = latencia cero; no justifica capa de cache externa |
| Validación | **Zod** | Doble uso: schemas en el main (IPC handlers) y en el renderer (formularios) |
| Forms | **react-hook-form + zod** | `zodResolver` para integrar validación sin boilerplate |
| Date library | **date-fns** | Liviano, tree-shakeable, sin dependencias |
| Tests E2E | Skip en MVP | Pruebas manuales suficientes para el alcance actual |
