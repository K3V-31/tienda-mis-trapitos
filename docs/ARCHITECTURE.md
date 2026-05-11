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
│  │   React    │  │  TanStack    │  │   shadcn/ui       │    │
│  │   19       │  │  Router      │  │   + Tailwind v4   │    │
│  └────────────┘  └──────────────┘  └───────────────────┘    │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │             TanStack Query (cache + mutations)         │  │
│  │   queryFn: () => window.api.products.list()            │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

**Reglas duras:**
- El renderer **nunca** importa `better-sqlite3`, `drizzle`, ni nada de Node. Todo pasa por IPC.
- El main **nunca** sabe de React. Solo expone handlers.
- El preload solo declara qué métodos existen; no implementa lógica.

---

## 2. Estructura de carpetas propuesta

```
tienda-mis-trapitos/
├── electron/                       # Código del main + preload
│   ├── main/
│   │   ├── index.ts                # entry: app.whenReady, createWindow
│   │   ├── window.ts               # creación de BrowserWindow
│   │   ├── ipc/                    # handlers por dominio
│   │   │   ├── index.ts            # registra todos los handlers
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
│   │   │   ├── client.ts           # better-sqlite3 + drizzle init
│   │   │   ├── schema.ts           # tablas Drizzle
│   │   │   ├── migrate.ts          # corre migraciones al arrancar
│   │   │   └── seed.ts             # admin inicial
│   │   ├── services/               # lógica de dominio (no IPC)
│   │   │   ├── auth.service.ts
│   │   │   ├── sales.service.ts    # transacción atómica
│   │   │   ├── inventory.service.ts
│   │   │   └── audit.service.ts    # wrapper para escribir al log
│   │   └── session.ts              # sesión en memoria del usuario activo
│   ├── preload/
│   │   └── index.ts                # contextBridge.exposeInMainWorld('api', ...)
│   └── shared/
│       ├── types.ts                # tipos compartidos main/renderer
│       └── ipc-channels.ts         # constantes de canales
│
├── src/                            # Renderer (React SPA, lo que ya existe)
│   ├── app/                        # shell, providers, layout
│   ├── routes/                     # TanStack Router (file-based)
│   │   ├── __root.tsx
│   │   ├── login.tsx
│   │   ├── _app/                   # rutas autenticadas
│   │   │   ├── pos.tsx             # POS para vendedor
│   │   │   ├── products/
│   │   │   ├── customers/
│   │   │   ├── suppliers/
│   │   │   ├── offers/
│   │   │   ├── inventory/
│   │   │   ├── reports/
│   │   │   ├── audit.tsx
│   │   │   └── users.tsx
│   ├── features/                   # lógica por feature (queries, forms)
│   │   ├── auth/
│   │   ├── products/
│   │   ├── sales/
│   │   └── ...
│   ├── shared/                     # ui, hooks, lib
│   ├── router.tsx
│   └── styles.css
│
├── drizzle/                        # migraciones generadas
├── docs/                           # PRD, US, este archivo
├── electron-builder.yml            # config de empaquetado
├── vite.config.ts                  # Vite config para el renderer
├── tsconfig.json
└── package.json
```

**Notas:**
- `electron/` contiene main + preload. `src/` contiene la SPA del renderer (Vite + React + TanStack Router file-based, **sin SSR**).
- Las rutas de `src/routes/_app/` quedan protegidas por un layout que verifica sesión consultando al main vía IPC.
- `electron/shared/` se importa tanto desde main como desde renderer (solo tipos, sin código de runtime).

---

## 3. Patrón de IPC

### 3.1 Definición de canales

Constantes en `electron/shared/ipc-channels.ts`:

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
// electron/main/ipc/products.ts
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
// electron/preload/index.ts
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

### 3.4 Uso en renderer (con TanStack Query)

```ts
// src/features/products/queries.ts
import { useQuery, useMutation } from '@tanstack/react-query';

export function useProducts(filters) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: async () => {
      const res = await window.api.products.list(filters);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });
}
```

---

## 4. Sesión y autorización

- La sesión vive en memoria del **main process** (`electron/main/session.ts`), como un singleton: `currentUser: User | null`.
- Tras `auth:login` exitoso, se setea; tras `auth:logout` o cierre de ventana, se limpia.
- Cada handler crítico llama `requireAuth()` y opcionalmente `requireRole(['admin'])`. Si no se cumple, devuelve `{ ok: false, error: 'unauthorized' }`.
- El renderer **no** mantiene la sesión; consulta `auth:currentUser` al arrancar y al cambiar de ruta protegida.

**Por qué no JWT/cookies:** no hay servidor ni clientes remotos. La app es local mono-usuario por proceso y la PC es la frontera de seguridad. JWT serviría para arquitecturas cliente-servidor, acá no aplica.

---

## 5. Servicio de auditoría

Patrón para no repetir código en cada handler:

```ts
// electron/main/services/audit.service.ts
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
// electron/main/services/sales.service.ts
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

### 7.1 Scripts de package.json (propuesta)

```json
{
  "scripts": {
    "dev:renderer": "vite dev --port 3300",
    "dev:electron": "electron-vite dev",
    "dev": "electron-vite dev",
    "build:renderer": "vite build",
    "build:electron": "electron-vite build",
    "build": "electron-vite build",
    "package": "electron-builder --dir",
    "dist": "electron-builder",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate"
  }
}
```

Se recomienda usar **`electron-vite`** para integrar Vite con el lifecycle de Electron (un solo comando para correr main + preload + renderer en dev con HMR).

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
// electron/main/db/migrate.ts
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

## 10. Decisiones técnicas a confirmar al iniciar Fase 0

| Decisión | Opción A | Opción B | Recomendación |
|----------|----------|----------|---------------|
| Wrapper de Vite/Electron | `electron-vite` | Setup manual | **A** — menos boilerplate |
| Routing del renderer | TanStack Router (file-based, SPA) | React Router | **A** — file-based + tipado fuerte |
| Forms | TanStack Form | react-hook-form | A elegir |
| Date library | date-fns | dayjs | A elegir; ninguno crítico |
| Tests E2E | Playwright para Electron | Skip en MVP | **Skip** — confía en pruebas manuales para MVP |
