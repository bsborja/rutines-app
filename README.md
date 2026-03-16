# ⭐ Rutines — Gestió de rutines diàries gamificada

Aplicació web full-stack per gestionar les rutines diàries de tres nenes i gamificar el comportament positiu. Tota la UI és en **català**.

## Stack

| Tecnologia | Ús |
|---|---|
| Next.js 14+ App Router | Framework |
| TypeScript | Tipatge |
| Supabase | BD + Storage + Realtime |
| Tailwind CSS v4 | Estils |
| Framer Motion | Animacions |
| Web Audio API | Sons positius |
| canvas-confetti | Confeti |
| Vercel | Deploy |

## Configuració ràpida

### 1. Instal·lar

```bash
npm install
```

### 2. Supabase

1. Crea un projecte a [app.supabase.com](https://app.supabase.com)
2. A **SQL Editor**, executa `supabase/schema.sql`
3. A **Storage**, crea un bucket `avatars` (públic)

### 3. Variables d'entorn

```bash
cp .env.example .env.local
# Edita .env.local amb les teves claus de Supabase
```

### 4. Executar

```bash
npm run dev
```

## Deploy a Vercel

```bash
npx vercel
```

O connecta el repo a Vercel i afegeix les env vars:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Primer ús (Onboarding)

1. Benvinguda → crea els 5 perfils automàticament
2. PINs → configura PIN de 4 dígits per a Borja i Montse
3. Fotos → opcional
4. Llest!

## Funcionalitats principals

- **Selecció de perfil**: 5 avatars, pares amb PIN
- **Rutines per moment**: Matí / Tarda / Nit / Cap de Setmana
- **3 opcions de conducta**: Bé (+10) / Regular (+3) / Malament (−5)
- **Confeti + so** en conductes positives
- **Mode Julia**: botons gegants, màxim 2 opcions
- **Pares**: registren per qualsevol nena (−50% extra si negatiu)
- **Nivells**: Principiant → Aprenent → Estel → Campiona → Llegenda
- **Insígnies**: ratxes de 3, 7 i 30 dies
- **Recompenses**: punts → euros → activitats
- **Classificació**: comparativa sense punts exactes

## Taules Supabase

| Taula | Descripció |
|---|---|
| `profiles` | Usuaris (nenes + pares) |
| `routines` | Catàleg de rutines (seed inclòs) |
| `routine_logs` | Registre de conductes |
| `weekly_summaries` | Resum setmanal |
| `badges` | Insígnies per ratxes |

## Equivalència de punts

- **1 punt = 0.025€**
- Objectiu setmanal: **100 pts ≈ 2.5€**
- Saldo mínim: **0** (no pot ser negatiu)
