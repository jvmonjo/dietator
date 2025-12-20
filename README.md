# Dietator

**Dietator** és una aplicació web progressiva (PWA) dissenyada per a la gestió eficient de dietes i desplaçaments professionals. Permet registrar serveis, calcular quilometratges automàticament i generar informes detallats en formats Word i PDF.

## Característiques Principals

- **Gestió de Serveis**: Registre de serveis amb data, hora d'inici/fi i múltiples desplaçaments.
- **Càlcul Automàtic de KM**: Integració amb Google Maps API (Distance Matrix) per calcular distàncies entre municipis.
    - Sistema de *caching* local per reduir costos de l'API.
    - Suport per a rutes complexes amb múltiples parades.
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

- **Framework**: [Nuxt 3](https://nuxt.com/) (Vue 4)
- **UI/Styling**: [Nuxt UI](https://ui.nuxt.com/) / Tailwind CSS
- **Estat**: Pinia amb persistència local.
- **Mapes**: Google Maps Distance Matrix API.
- **Documents**: `docxtemplater`, `pizzip` (Word) i `pdfmake` (PDF).

## Desenvolupament

### Requisits Previs

- Node.js (v18 o superior)
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
```

## Llicència

## Llicència

**Copyright (c) 2025 Josep Monjo**

Aquest projecte està llicenciat sota la **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)**.
Pots veure el text complet al fitxer [LICENSE](LICENSE).

Això significa que:
1.  **Attribution (BY)**: Has de donar crèdit a l'autor original.
2.  **NonCommercial (NC)**: No pots utilitzar el material per a finalitats comercials.
3.  **ShareAlike (SA)**: Si remescles, transformes o crees a partir del material, has de distribuir les teves contribucions sota la mateixa llicència.
