# Plantilles Word: Variables i Bucles

Aquest document recull tots els placeholders que es poden fer servir dins de les plantilles Word de Dietator i com s'han d'estructurar els bucles per recorrer serveis o desplaçaments. Tot el processat té lloc al client, així que les plantilles són simples documents `.docx` amb text del tipus `Import total [month_allowance]` o seccions repetides delimitades amb marques `[loop:...] ... [endloop:...]`.

## Convencions generals
- **Format de variables**: sempre entre claudàtors, en minúscules i separades amb `_`, p. ex. `[service_start_date]`.
- **Dates i hores**: per defecte ISO local (`YYYY-MM-DD` i `HH:mm`). Pots afegir sufixos per indicar altres formats: `[service_start_date:human]` per mostrar `25 de març de 2024`.
- **Valors booleans**: es despleguen com `Sí`/`No`. També hi ha versions booleanes (`[displacement_has_lunch:boolean]`) que retornen `true`/`false`.
- **Limitador de text**: utilitza `:limitN` per tallar una cadena als primers `N` caràcters (p. ex. `[displacement_municipality:limit3]` mostra només les tres primeres lletres).
- **Loops**: es defineixen amb `[loop:nom]` i `[endloop:nom]`. Els noms han de coincidir i els loops es poden niar.
- **Condicionals**: per amagar o mostrar blocs de text utilitza `[if:variable] ... [endif:variable]`. La secció només s'imprimirà si la variable és certa (`true`, número diferent de 0 o text no buit).

## Variables globals
| Variable | Descripció |
| --- | --- |
| `[half_diet_price]` | Import configurat per a mitja dieta. |
| `[full_diet_price]` | Import configurat per a dieta completa. |
| `[current_month_label]` | Mes i any actual (ex. `març 2024`). |
| `[current_month_key]` | Clau tècnica `YYYY-MM`. |

## Variables mensuals (plantilla de "tots els desplaçaments del mes")
| Variable | Descripció |
| --- | --- |
| `[month_service_count]` | Serveis registrats en el període. |
| `[month_displacement_count]` | Nombre total de desplaçaments. |
| `[month_lunches]` | Comptador de dinars. |
| `[month_dinners]` | Comptador de sopars. |
| `[month_half_diets]` | Serveis amb un sol àpat. |
| `[month_full_diets]` | Serveis amb dinar i sopar. |
| `[month_diet_units]` | Hores/dietes normalitzades (full=1, mitja=0.5). |
| `[month_allowance]` | Quantitat total en euros (aplica els preus configurats). |
| `[previous_month_last_working_day]` | ISO `YYYY-MM-DD` del darrer dia laborable del mes anterior. |
| `[previous_month_last_working_day:human]` | Format llarg del mateix dia (`12 de desembre de 2025`). |
| `[previous_month_last_working_day_minus_1]` | ISO del penúltim dia laborable del mes anterior. |
| `[previous_month_last_working_day_minus_1:human]` | Format llarg del penúltim dia. |
| `[previous_month_last_working_day_minus_2]` | ISO del tercer darrer dia laborable. |
| `[previous_month_last_working_day_minus_2:human]` | Format llarg del tercer darrer dia. |

### Bucle dels serveis del mes
```
[loop:services]
Servei #[service_index]
Inici: [service_start_date] [service_start_time]
Fi: [service_end_date] [service_end_time]
Dietes en servei: [service_half_diets] mitges · [service_full_diets] completes
[loop:service_displacements]
  - [displacement_province], [displacement_municipality] (Dinar: [displacement_has_lunch] / Sopar: [displacement_has_dinner])
[endloop:service_displacements]
[endloop:services]
```
Variables disponibles dins del bucle `services`:
- `[service_index]`: posició (1-based).
- `[service_id]`: identificador intern.
- `[service_start_date]`, `[service_start_time]`, `[service_end_date]`, `[service_end_time]`.
- `[service_duration_hours]`: durada estimada.
- `[service_displacement_count]`: número de desplaçaments.
- `[service_half_diets]`, `[service_full_diets]`, `[service_lunches]`, `[service_dinners]`.
- `[service_total_allowance]`: diners imputats al servei.

### Bucle dels desplaçaments mensuals (sense agrupar per servei)
```
[loop:month_displacements]
[displacement_date] · [displacement_province] / [displacement_municipality] · Dinar: [displacement_has_lunch] · Sopar: [displacement_has_dinner]
Servei vinculat: [service_start_date]
[endloop:month_displacements]
```
Aquest bucle recorre seqüencialment tots els desplaçaments del període filtrat. A dins tens les mateixes variables que al bucle de `service_displacements` i, addicionalment, `[service_start_date]` i `[service_id]` per referenciar el servei pare.

## Variables per a plantilles d'un servei individual
Aquestes plantilles s'utilitzen quan es genera la documentació d'un únic servei (p. ex. per enviar a un supervisor).

| Variable | Descripció |
| --- | --- |
| `[service_reference]` | Alias llegible (`SERV-2024-03-19-01`). |
| `[service_start_iso]` / `[service_end_iso]` | Timestamp complet (`YYYY-MM-DDTHH:mm`). |
| `[service_total_lunches]` / `[service_total_dinners]` | Comptadors. |
| `[service_total_allowance]` | Import total. |

### Bucle d'un servei individual
```
[loop:service_displacements]
Desplaçament [displacement_index]
Ruta: [displacement_province] / [displacement_municipality:limit3]
Àpats: [displacement_meals]
[endloop:service_displacements]
```
Variables disponibles per a cada desplaçament:
- `[displacement_index]` (1-based dins del servei) i `[month_index]` (posició global del mes quan es genera una plantilla mensual).
- `[displacement_province]`, `[displacement_municipality]`.
- `[displacement_has_lunch]`, `[displacement_has_dinner]`, `[displacement_meals]` (retorna `Dinar`, `Sopar`, `Dinar i sopar` o `—`).
- `[displacement_id]` per fer traçabilitat.

### Condicionals dins la plantilla de servei
Quan treballes amb Word és important que cada placeholder estigui dins del mateix run de text. Si hi ha salts de format (part del text en negreta, canvis de font, etc.) entre el `[` i el `]`, el motor no el reconeixerà i els loops semblaran “buits”. Per evitar-ho:

- Escriu les etiquetes en un estil de text pla (Ctrl+Maj+V per enganxar com a text).
- Verifica el `document.xml` (o fes servir la vista d’esborrany) per assegurar-te que `[loop:...]` i `[endif:...]` apareixen com a text continu.
- Evita inserir placeholders dins de taules o camps automàtics si Word els divideix.

Per imprimir el detall del dinar o del sopar només quan existeix, envolta el fragment amb `[if:displacement_has_lunch] ... [endif:displacement_has_lunch]` o la versió de sopar. A l'exemple següent es mostra com convertir el text pla en un bloc condicionat per cada desplaçament:

```
El servei ha començat a les [service_start_time] i ha finalitzat a les [service_end_time].

[loop:service_displacements]
[if:displacement_has_lunch]
Dinar: [displacement_municipality] ([displacement_province])
[endif:displacement_has_lunch]

[if:displacement_has_dinner]
Sopar: [displacement_municipality] ([displacement_province])
[endif:displacement_has_dinner]
[endloop:service_displacements]

En València a [service_start_date]
```

Així cada línia de dinar o sopar només apareixerà si el desplaçament té l'àpat corresponent, evitant buits innecessaris a la plantilla final.

Per mostrar la data en format humà (`12 de desembre de 2025`) utilitza el modificador `:human`. L'exemple quedaria:

```
El servei ha començat a les [service_start_time] i ha finalitzat a les [service_end_time].

[loop:service_displacements]
[if:displacement_has_lunch]
Dinar: [displacement_municipality] ([displacement_province])
[endif:displacement_has_lunch]

[if:displacement_has_dinner]
Sopar: [displacement_municipality] ([displacement_province])
[endif:displacement_has_dinner]
[endloop:service_displacements]

En València a [service_start_date:human]
```

## Plantilles recomanades
- **Plantilla mensual**: utilitza els bucles `[loop:services]` i/o `[loop:month_displacements]` juntament amb les variables `month_*` per construir resums i taules totals.
- **Plantilla de servei**: centra't en les variables `service_*` i en el bucle `[loop:service_displacements]`.

## Exemple ràpid
```
Informe del mes [current_month_label]
Serveis registrats: [month_service_count]
Dietes totals: [month_diet_units]
Import total: [month_allowance]

[loop:services]
Servei [service_index] ([service_start_date])
  - Desplaçaments: [service_displacement_count]
  - Dietes: [service_full_diets] completes, [service_half_diets] mitges
[endloop:services]
```
Aquesta estructura genera una pàgina resum seguida d'un bloc per a cada servei. Només cal copiar els placeholders a la plantilla Word i Dietator substituirà cada marcador amb la dada corresponent.
