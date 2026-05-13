# Empaquetado Windows (Fase 7)

## Objetivo

Generar un instalador `.exe` para Windows usando `electron-builder` con target **NSIS**, alineado con el PRD del MVP offline.

## Scripts disponibles

- `npm run pack`
  - Compila la app y genera el directorio empaquetado sin instalador final.
- `npm run dist:win`
  - Compila la app y genera el instalador NSIS para Windows.

## Decisiones técnicas

- Se usa **`electron-builder`** con target `nsis` porque el PRD exige instalador `.exe` de doble clic.
- Se mantiene `asar: true` para empaquetado de producción.
- Se agrega `asarUnpack: ["**/*.node"]` porque `better-sqlite3` es un módulo nativo y no debe quedar encapsulado de forma que rompa su carga en runtime.
- **No** se configuró `extraResources` para migraciones porque este proyecto no usa archivos de migración externos de Drizzle; la creación/evolución del esquema está embebida en `src/main/db/migrate.ts` mediante `sqlite.exec(...)`.

## Salida esperada

Los artefactos se generan en la carpeta `release/`.

Ejemplo esperado:

- `release/Mis Trapitos POS-Setup-1.0.0.exe`

## Validación manual en PC limpia

La Fase 7 NO se considera cerrada solo por tener config. Hay que probar el instalador en Windows real.

Checklist mínimo:

1. Ejecutar el `.exe` con doble clic.
2. Confirmar que instala sin pasos manuales extra fuera del wizard de NSIS.
3. Abrir la app instalada.
4. Verificar que crea `app.db` en `app.getPath('userData')`.
5. Confirmar login con el admin seed inicial.
6. Revisar que `better-sqlite3` carga bien en runtime empaquetado.
7. Crear una categoría o producto para validar escritura real en SQLite.
8. Verificar que el acceso sigue funcionando sin internet.

## Riesgos conocidos

- **SmartScreen / Defender** puede advertir al usuario porque el MVP no incluye code signing.
- El instalador queda preparado para **Windows x64**.
- La validación final de esta fase depende de probar el `.exe` en una PC Windows limpia.
