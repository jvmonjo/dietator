# Resum d'Incidències i Solucions - Edició de Serveis

Aquest document recull els problemes trobats durant la implementació de la funcionalitat "Editar Servei" i les solucions aplicades.

## 1. Modal Buit (Falta de Renderitzat)

**Problema:**
En fer clic al botó "Editar", el component `UModal` s'obria però el seu contingut (`ServiceForm`) no es renderitzava. El cos del modal apareixia buit. Això sembla ser degut a un conflicte de renderitzat amb els *slots* de `UModal` en l'entorn actual o versió de la llibreria.

**Solució:**
S'ha substituït l'ús del component `UModal` estàndard per una **implementació personalitzada d'un modal (Overlay)** utilitzant CSS i HTML estàndard.
- S'ha creat un `div` fixat (`fixed inset-0`) amb fons semitrasparent (`backdrop`) i un contenidor centrat per al formulari.
- Aquesta solució garanteix que el `ServiceForm` es renderitzi correctament independentment del component de llibreria.

## 2. Fons Transparent en Desplegables

**Problema:**
Els camps de cerca dins dels desplegables de Província i Municipi (`USelectMenu`) tenien el fons transparent. Això feia que el text de cerca es barregés amb el contingut de sota (com els checkboxs), dificultant la lectura.

**Solució:**
S'ha afegit CSS específic amb selectors `deep` als components `ProvinceSelect.vue` i `MunicipalitySelect.vue` per forçar un fons sòlid a l'input de cerca.

```css
/* Fixat a ProvinceSelect.vue i MunicipalitySelect.vue */
:deep(input) {
  background-color: rgb(255 255 255 / var(--tw-bg-opacity, 1));
}
.dark :deep(input) {
  background-color: rgb(17 24 39 / var(--tw-bg-opacity, 1));
}
```

## 3. Desplegables Ocults (Z-Index i Clipping)

**Problema:**
El menú desplegable de les opcions quedava per sota dels elements següents del formulari degut al context d'apilament (Stacking Context). Intentar forçar el `z-index` no funcionava perquè el contenidor pare (`UFormField` o `div relative`) retallava o limitava l'índex.

**Solució:**
S'ha habilitat el comportament de **Portal** en els components `USelectMenu`.
- S'ha eliminat la propietat `:portal="false"` (deixant que per defecte sigui `true`).
- Això fa que el desplegable es renderitzi al final del `body` del document, sortint del context local i evitant qualsevol problema de superposició o retall (clipping) amb altres camps del formulari.
- El `z-index` alt del portal (gestionat per la llibreria) assegura que es mostri per sobre de tot, inclús del modal personalitzat.

## Resum de Fitxers Modificats
- `app/components/ServiceList.vue`: Implementació del modal personalitzat.
- `app/components/ServiceForm.vue`: Correcció de dependència `uuid`.
- `app/components/MunicipalitySelect.vue`: Estils CSS (fons input i z-index) i Portal actiu.

## 4. Refactorització "Afegir Servei"

**Canvi:**
S'ha mogut el formulari de creació de serveis (que estava fix al final de la pàgina principal) a un modal, per netejar la interfície i unificar l'experiència d'usuari amb l'edició.

**Implementació:**
- Eliminat `<ServiceForm />` de `index.vue`.
- Afegit botó "Afegir servei" a la capçalera de `ServiceList.vue`.
- Reutilització del mateix modal personalitzat (Overlay) per a la creació, passant `selectedRecord = null`.


Si has d'afegir un text, fes-ho sempre amb variables traduibles i afegeix les traduccions als fitxers corresponents.