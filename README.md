# Dietator

**Dietator** és una aplicació web progressiva (PWA) dissenyada per a la gestió eficient de dietes i desplaçaments professionals. Permet registrar serveis, calcular quilometratges automàticament i generar informes detallats en formats Word i PDF.

## Característiques Principals

- **Gestió de Serveis**: Registre de serveis amb data, hora d'inici/fi i múltiples desplaçaments.
- **Càlcul Automàtic de KM**: Integració amb Google Maps API (Distance Matrix) per calcular distàncies entre municipis.
    - Sistema de *caching* local per reduir costos de l'API.
    - Suport per a rutes complexes amb múltiples parades.
- **Gestió de Despeses**: Registre de les despeses vinculades a les dietes.
    - **Categories**: Dieta, Pàrquing, Benzina, Peatges i Altres. Només les de *Dieta* descompten del balanç; la resta es comptabilitzen a part (compte diferent).
    - **Tiquets**: Adjunta el comprovant des de la galeria o la càmera, amb pas de retall i mode escala de grisos per reduir-ne la mida. Es poden previsualitzar i descarregar dins l'app.
    - **Balanç i estadístiques**: Totals separats de despeses de dieta i altres, mitjana diària de dieta, balanç net (dietes − despeses de dieta) i desglossament per categoria.
    - **Calendari**: Navega pels mesos, marca els dies amb despeses i filtra la llista per dia; filtre addicional per categoria.
    - **Compartir per QR**: Genera un codi QR d'una despesa i importa-la a un altre dispositiu amb la càmera (el tiquet no s'hi inclou).
    - **Manteniment**: Consulta l'espai ocupat pels tiquets i elimina'ls (tots o per període) des de Configuració, sense perdre les despeses.
- **Generació de Documents**:
    - **Informes Word**: Generació de documents mensuals o per servei utilitzant plantilles `.docx` personalitzables.
    - **Estadístiques PDF**: Resums visuals de les dietes, serveis i imports totals.
- **Dades Personals i Configuració**:
    - Gestió de preus de mitja dieta i dieta completa.
    - Camps de dades personals (Nom, Cognoms, DNI) per a les plantilles.
- **Privacitat i Seguretat**:
    - Totes les dades es guarden localment al navegador (`localStorage`).
    - Sistema de Backups (Importar/Exportar) amb opció de xifratge per contrasenya.
- **Mode Offline**: Funciona sense connexió gràcies a la tecnologia PWA.

## Tecnologies

- **Framework**: [Nuxt 4](https://nuxt.com/) (Vue 4)
- **UI/Styling**: [Nuxt UI](https://ui.nuxt.com/) / Tailwind CSS
- **Estat**: Pinia amb persistència local.
- **Mapes**: Google Maps Distance Matrix API.
- **Documents**: `docxtemplater`, `pizzip` (Word) i `pdfmake` (PDF).

## Configuració Google Calendar (Desenvolupament)

Per habilitar la integració amb Google Calendar, cal crear un projecte a Google Cloud Platform i configurar les credencials OAuth.

1.  **Crear Projecte**: Ves a [Google Cloud Console](https://console.cloud.google.com/) i crea un nou projecte.
2.  **Habilitar API**: Al menú "APIs & Services" -> "Library", busca "Google Calendar API" i habilita-la.
3.  **Pantalla de Consentiment**: Ves a "APIs & Services" -> "OAuth consent screen".
    -   Tria "External" (per proves personals) o "Internal" (si tens organització).
    -   Omple els camps obligatoris (Nom App, correus de suport).
    -   Afegeix l'scope: `https://www.googleapis.com/auth/calendar.readonly`.
    -   Afegeix el teu correu com a "Test User".
4.  **Crear Credencials**: Ves a "APIs & Services" -> "Credentials".
    -   "Create Credentials" -> "OAuth Client ID".
    -   Application type: "Web application".
    -   **Authorized JavaScript origins**: `http://localhost:3000` (i la URL de producció quan es desplegui).
    -   **Authorized redirect URIs**: `http://localhost:3000` (tot i que el flux implícit pot no fer-ho servir, Google ho requereix).
5.  **Configurar App**: Copia el "Client ID" generat.
    -   Crea un fitxer `.env` a l'arrel del projecte (fes servir `.env.example` com a base).
    -   Defineix la variable: `NUXT_PUBLIC_GOOGLE_CLIENT_ID=teu-client-id`.

## Desenvolupament

### Requisits Previs

- Node.js (v20 o superior)
- npm o pnpm

### Instal·lació

```bash
# Instal·lar dependències
npm install
```

### Execució Local

Inicia el servidor de desenvolupament a `http://localhost:3000`:

```bash
npm run dev
```

### Construcció (Build)

Generar l'aplicació per a producció:

```bash
npm run build
```

Per previsualitzar la versió de producció localment:

```bash
npm run preview
```

### Linting i Testing

```bash
# Executar verificació de tipus
npm run typecheck

# Executar linter
npm run lint

# Executar els tests unitaris (Vitest)
npm test

# Tests en mode watch
npm run test:watch

# Tests amb informe de cobertura
npm run test:coverage
```

Els tests unitaris (`test/`) cobreixen la lògica de domini principal: xifratge
de backups, generació de recordatoris de calendari, emmagatzematge segur, el
store de serveis i les advertències de validació de serveis. S'executen amb
[Vitest](https://vitest.dev/) sense necessitat d'arrencar Nuxt, de manera que
són ràpids i deterministes. S'executen automàticament al *hook* de pre-commit i
a la CI (GitHub Actions).
