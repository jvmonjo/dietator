## [1.13.3](https://github.com/jvmonjo/dietator/compare/v1.13.2...v1.13.3) (2025-12-20)


### Bug Fixes

* move search input icon to leading slot for better control ([e574e65](https://github.com/jvmonjo/dietator/commit/e574e65c21b47742d71bb396ed1713892bdb8398))

## [1.13.2](https://github.com/jvmonjo/dietator/compare/v1.13.1...v1.13.2) (2025-12-20)


### Bug Fixes

* add clear button to search input ([df6791b](https://github.com/jvmonjo/dietator/commit/df6791b55e6554877c8e9329137184eb24caf936))

## [1.13.1](https://github.com/jvmonjo/dietator/compare/v1.13.0...v1.13.1) (2025-12-20)


### Bug Fixes

* relocate record count badge and reorder `useSortable` import. ([49f6b4b](https://github.com/jvmonjo/dietator/commit/49f6b4be1e99f0e73191df8507fcada6805e49c4))

# [1.13.0](https://github.com/jvmonjo/dietator/compare/v1.12.0...v1.13.0) (2025-12-20)


### Features

* reorder service list columns and replace button text with tooltips ([5530afb](https://github.com/jvmonjo/dietator/commit/5530afbc0c14752994e897b6dc323318484c1889))

# [1.12.0](https://github.com/jvmonjo/dietator/compare/v1.11.0...v1.12.0) (2025-12-20)


### Features

* enable drag-and-drop reordering for service displacements using Sortable.js and VueUse integrations. ([42dc8c0](https://github.com/jvmonjo/dietator/commit/42dc8c072ad16f02058570fb972ea01ac5978c58))
* trigger kilometer auto-calculation when displacement count changes or no value is present ([28e2467](https://github.com/jvmonjo/dietator/commit/28e2467cd65c8f4967a8ef4ef469c6dba4824fd7))

# [1.11.0](https://github.com/jvmonjo/dietator/compare/v1.10.0...v1.11.0) (2025-12-20)


### Features

* Add search and pagination functionality to the service records list. ([9d48877](https://github.com/jvmonjo/dietator/commit/9d48877ec4aee459032b6d6a9a4682df4e929ced))

# [1.10.0](https://github.com/jvmonjo/dietator/compare/v1.9.0...v1.10.0) (2025-12-20)


### Features

* Add displacement observations field to UI, data model, help, and export. ([55136cb](https://github.com/jvmonjo/dietator/commit/55136cb9813aa058b9fbc0cf9fd727a7d9109c17))
* Add distance cache management to settings page with clear functionality and statistics. ([374a00b](https://github.com/jvmonjo/dietator/commit/374a00be888ee7724f3c99d2ae6033e7c280d23c))
* Implement data maintenance and cleanup features with safe local storage and enhanced confirmation modal. ([1ae141a](https://github.com/jvmonjo/dietator/commit/1ae141a3e2e7aa542a7766c9471057f57410b868))

# [1.9.0](https://github.com/jvmonjo/dietator/compare/v1.8.0...v1.9.0) (2025-12-20)


### Features

* add iconify dev dependencies and simplify report generation button text ([fa1153a](https://github.com/jvmonjo/dietator/commit/fa1153a7fe8e2d990c468f8467b6fdc377f49e1a))
* Add personal data fields (name, DNI/NIE) with validation and template support. ([3e48eae](https://github.com/jvmonjo/dietator/commit/3e48eae091b7ffdd456a2d34c84d0c05ff07ff4d))
* add proprietary proprietary license file ([0a087de](https://github.com/jvmonjo/dietator/commit/0a087ded327273568d2f4ad4f7c02cf625876152))
* Rework month and year selection to use separate dropdowns for month and year, including an "all months" option. ([368a7bc](https://github.com/jvmonjo/dietator/commit/368a7bccb43d5979144e0414874a6ce15a0ad686))

# [1.8.0](https://github.com/jvmonjo/dietator/compare/v1.7.0...v1.8.0) (2025-12-19)


### Bug Fixes

* update UI text from 'informes' and 'informe Word' to 'documents' ([788fa48](https://github.com/jvmonjo/dietator/commit/788fa4893a21d5dbf7925e9b9a24da3d3f2e97e2))


### Features

* Add optional notes field to service records, form, export, and help documentation. ([7cabc73](https://github.com/jvmonjo/dietator/commit/7cabc731a2974ecc3b20885c9b020bd9bbf6665b))

# [1.7.0](https://github.com/jvmonjo/dietator/compare/v1.6.0...v1.7.0) (2025-12-19)


### Bug Fixes

* Remove 'Unitats de Dieta' from PDF report generation. ([1262070](https://github.com/jvmonjo/dietator/commit/1262070f08c4d86ed266d18441fb4cd789a27e52))


### Features

* Add `is_first`, `is_last`, and `has_next` conditional loop variables and document their usage in the help page. ([a8d83f6](https://github.com/jvmonjo/dietator/commit/a8d83f6e15177bc241ad221e063ba460adf2a942))
* Move month selection and record filtering logic from ServiceList to index page, passing filtered records as a prop. ([0eb9af3](https://github.com/jvmonjo/dietator/commit/0eb9af3a14fb2301fd2a25e3207f9596abbf51ab))

# [1.6.0](https://github.com/jvmonjo/dietator/compare/v1.5.3...v1.6.0) (2025-12-19)


### Features

* add duplicate start date validation to service form ([50aa911](https://github.com/jvmonjo/dietator/commit/50aa911cffb95265cce98c0f0cd0b0f7ade9cd49))
* move meal validation from form to a warning and filter non-meal services from Word exports. ([61fa5a6](https://github.com/jvmonjo/dietator/commit/61fa5a6bfcd25f5a3916acff5f653bb4cd70930d))

## [1.5.3](https://github.com/jvmonjo/dietator/compare/v1.5.2...v1.5.3) (2025-12-19)


### Bug Fixes

* Replace native confirm dialog with UModal for service deletion and remove unused `sanitizeSegment` function and empty `ClientOnly` block. ([005a558](https://github.com/jvmonjo/dietator/commit/005a558016fa1b07a578557f1366263fc8ec935c))

## [1.5.2](https://github.com/jvmonjo/dietator/compare/v1.5.1...v1.5.2) (2025-12-19)


### Bug Fixes

* remove explicit auto-calculate kilometers checkbox and trigger calculation implicitly when API key is present and kilometers are not set. ([208ad9a](https://github.com/jvmonjo/dietator/commit/208ad9aa0f5a9c12fbf704afabe308368680449c))

## [1.5.1](https://github.com/jvmonjo/dietator/compare/v1.5.0...v1.5.1) (2025-12-19)


### Bug Fixes

* enable help link and separator in footer ([46e84ca](https://github.com/jvmonjo/dietator/commit/46e84ca71572f08ac9c060c31fd9c6189994d97b))

# [1.5.0](https://github.com/jvmonjo/dietator/compare/v1.4.2...v1.5.0) (2025-12-19)


### Features

* add JSON data file generation to export functionality ([bc29290](https://github.com/jvmonjo/dietator/commit/bc29290d87e58d99b37f9f2ac1d27b9cbad875a5))

## [1.4.2](https://github.com/jvmonjo/dietator/compare/v1.4.1...v1.4.2) (2025-12-19)


### Bug Fixes

* Reorder filename components for all exports and backups to start with date or month. ([87a876e](https://github.com/jvmonjo/dietator/commit/87a876ee2106bb87ac231e5a23b51d6482a17aef))

## [1.4.1](https://github.com/jvmonjo/dietator/compare/v1.4.0...v1.4.1) (2025-12-19)


### Bug Fixes

* implement PWA update detection and display a notification banner in the default layout. ([df3cd17](https://github.com/jvmonjo/dietator/commit/df3cd175a5ba09548ebe6283db98d2a8dfff8bbf))

# [1.4.0](https://github.com/jvmonjo/dietator/compare/v1.3.8...v1.4.0) (2025-12-19)


### Features

* add municipality name formatter and condense displacement details in service list display. ([3527d26](https://github.com/jvmonjo/dietator/commit/3527d267d2afc0d7b7580d3d0b9a91cdc1d44266))

## [1.3.8](https://github.com/jvmonjo/dietator/compare/v1.3.7...v1.3.8) (2025-12-19)


### Bug Fixes

* replace custom PWA update detection and trigger logic with the Nuxt PWA module's `$pwa` API. ([a893d61](https://github.com/jvmonjo/dietator/commit/a893d61eafca59d05101f68edcb7b4f0e00c0a4b))

## [1.3.7](https://github.com/jvmonjo/dietator/compare/v1.3.6...v1.3.7) (2025-12-19)


### Bug Fixes

* dynamically construct logo URL using runtime config baseURL to ensure accurate path resolution ([fe620fe](https://github.com/jvmonjo/dietator/commit/fe620fefa5dde491112d65cae88f706d7c5048ff))

## [1.3.6](https://github.com/jvmonjo/dietator/compare/v1.3.5...v1.3.6) (2025-12-19)


### Bug Fixes

* Always trigger page reload after PWA update, conditionally skip waiting, and reduce reload delay. ([8e68f4b](https://github.com/jvmonjo/dietator/commit/8e68f4bed7b6f9eda2bed7b3035a77fc5670f3ce))

## [1.3.5](https://github.com/jvmonjo/dietator/compare/v1.3.4...v1.3.5) (2025-12-19)


### Bug Fixes

* remove unused `LoaderOptions` type import from `useDistanceCalculator` ([758117b](https://github.com/jvmonjo/dietator/commit/758117b7244c2c6695b9730f637ace85eecf6216))

## [1.3.4](https://github.com/jvmonjo/dietator/compare/v1.3.3...v1.3.4) (2025-12-19)


### Bug Fixes

* Introduce fallback page reload for PWA updates if controllerchange doesn't fire. ([755320a](https://github.com/jvmonjo/dietator/commit/755320a380438259ec772fad1bc476e81daa9ccd))

## [1.3.3](https://github.com/jvmonjo/dietator/compare/v1.3.2...v1.3.3) (2025-12-19)


### Bug Fixes

* Update Google Maps API loading and enhance distance calculation to provide detailed route information including path and source. ([ce75a2d](https://github.com/jvmonjo/dietator/commit/ce75a2deb396ff48bb7a554071e5dca06a354cdc))

## [1.3.2](https://github.com/jvmonjo/dietator/compare/v1.3.1...v1.3.2) (2025-12-19)


### Bug Fixes

* Remove explicit `updateAvailable` flag reset from PWA update notification and client plugin ([8a2b19b](https://github.com/jvmonjo/dietator/commit/8a2b19b6ce42abd3a4935c90661a344e5d190b6b))

## [1.3.1](https://github.com/jvmonjo/dietator/compare/v1.3.0...v1.3.1) (2025-12-19)


### Bug Fixes

* Remove return trip calculation from total distance in `useDistanceCalculator` composable. ([e62be5d](https://github.com/jvmonjo/dietator/commit/e62be5d306bb26a8d4acdd42be2760c283336a5d))

# [1.3.0](https://github.com/jvmonjo/dietator/compare/v1.2.0...v1.3.0) (2025-12-19)


### Features

* Add Google Maps API key to settings form and loading. ([893dbae](https://github.com/jvmonjo/dietator/commit/893dbae64f6f7c2d4995714398c0eda9eb56f5b7))

# [1.2.0](https://github.com/jvmonjo/dietator/compare/v1.1.1...v1.2.0) (2025-12-19)


### Features

* add logo to PDF header and adjust header layout, making PDF generation asynchronous ([1f8f17f](https://github.com/jvmonjo/dietator/commit/1f8f17f204b6ce51efe414a9ab7c92144079e431))
* add PDF generation for monthly service statistics and integrate it into the export process. ([68e2b14](https://github.com/jvmonjo/dietator/commit/68e2b14695e7fdbd6e45995252f2797f36e614ea))
* Implement kilometer tracking for services with Google Maps distance calculation and display. ([28a6980](https://github.com/jvmonjo/dietator/commit/28a6980a92cc98eeac635653f51a1feef6892f31))
* Sort records by start time in the service list and export utilities. ([4e374d0](https://github.com/jvmonjo/dietator/commit/4e374d0185fb3453eb7bdb858e6e75068263acbd))
* Translate various UI texts, form fields, and navigation labels to Catalan. ([456a5c4](https://github.com/jvmonjo/dietator/commit/456a5c427d6d2c7d35b91b5138c157cc7a5ad8f1))

## [1.1.1](https://github.com/jvmonjo/dietator/compare/v1.1.0...v1.1.1) (2025-12-19)


### Bug Fixes

* apply lunch and dinner warnings only if service starts and ends on the same day ([c1d85c4](https://github.com/jvmonjo/dietator/commit/c1d85c4ed236aec76fb27e67dad4ffdbea9629bf))

# [1.1.0](https://github.com/jvmonjo/dietator/compare/v1.0.0...v1.1.0) (2025-12-19)


### Features

* add dedicated help page with template variable documentation and integrate it into the navigation, footer, and settings. ([89ba5ba](https://github.com/jvmonjo/dietator/commit/89ba5ba582f01827d26d882852e1722bf097d844))

# 1.0.0 (2025-12-19)


### Bug Fixes

* add @nuxtjs/color-mode module ([2ba96f4](https://github.com/jvmonjo/dietator/commit/2ba96f47c43f4cbeb2103e765c24041d4b645d6c))
* add color mode and dark mode computed property setup in AppHeader ([9815e61](https://github.com/jvmonjo/dietator/commit/9815e6151a2c60a5aeccc47510d4b851f86a0c24))
* Add GitHub Pages deployment workflow and configure Nuxt base URL for static export. ([2c93a8d](https://github.com/jvmonjo/dietator/commit/2c93a8df289ff9a63f89ec847fcb5ad564a976ad))
* add settings page with backup/restore functionality, price configuration, and template management. ([5758a55](https://github.com/jvmonjo/dietator/commit/5758a55ef7f8a245c16ac31ae519d7d5bb316c4b))
* Add utility for generating and exporting templated Word reports from service and displacement data. ([612019f](https://github.com/jvmonjo/dietator/commit/612019f93b750f9d363d78c3d835e0319fa7102b))
* add zod dependency for schema validation ([a351208](https://github.com/jvmonjo/dietator/commit/a351208518f7ae3d22f7569f7271ab6bae73119d))
* Adjust SPA loading template path in nuxt.config.ts. ([5ae75da](https://github.com/jvmonjo/dietator/commit/5ae75da0b264140e527139a29a854f1024580b04))
* Comment out UAvatar component in AppHeader for future use ([67aac85](https://github.com/jvmonjo/dietator/commit/67aac85d08e3f735703fc52042bfd226c7d1a7cd))
* conditionally initialize colorMode with error handling for unavailability ([f8e059e](https://github.com/jvmonjo/dietator/commit/f8e059e84498f1ff70b39a9e656554c4f3997696))
* Correct relative CSS path in Nuxt configuration. ([5a83284](https://github.com/jvmonjo/dietator/commit/5a83284aacbad0fa60f272817a1af255543f2272))
* **deps:** downgrade @nuxtjs/color-mode to v3.5.2 and remove @nuxtjs/tailwindcss from devDependencies ([842f2ce](https://github.com/jvmonjo/dietator/commit/842f2ce0212fff2ebf6c0e028e73e5d48df77784))
* Remove cache restoration from CI workflow and simplify color mode initialization in AppHeader. ([59149f2](https://github.com/jvmonjo/dietator/commit/59149f2a4c625f30a681096dbb27768ce179816d))
* remove explicit imports for auto-imported functions ([6997ccd](https://github.com/jvmonjo/dietator/commit/6997ccd95d202a2582d9c4974b6a2b758acc8b24))
* Removed no longer used municipalities.json file. ([b32953f](https://github.com/jvmonjo/dietator/commit/b32953f8010aacd794c12bf91062a4a9b6b0adc6))
* Set NUXT_DEBUG environment variable to string "1" ([a49ef43](https://github.com/jvmonjo/dietator/commit/a49ef43bb3ab7140b944394826f78622cf401663))
* standardize base URL handling across app and PWA configurations and enable conditional Nitro debug. ([2e50e1a](https://github.com/jvmonjo/dietator/commit/2e50e1a08c561a795bf4e80e70a1a6345cc49260))
* update export data checkbox label to specify service data ([5a027ec](https://github.com/jvmonjo/dietator/commit/5a027ec91163e4c992e46af37b54142299f54089))
* València single name to short ([f552977](https://github.com/jvmonjo/dietator/commit/f55297727635e863dfdfd36ee3786cb9ff835643))


### Features

* add @nuxtjs/color-mode dependency to enable color mode functionality ([6773a57](https://github.com/jvmonjo/dietator/commit/6773a57e13d012fbef3b3495fc31d58ae8f4467e))
* Add `AppHeader` component with dark mode toggle and configure Nuxt to use dynamic base URL for assets. ([69bdfd3](https://github.com/jvmonjo/dietator/commit/69bdfd33c7d085f5184842bdd142ff3ded6740cc))
* Add `municipalities.json` with Spanish municipality data and update package dependencies. ([8d6fa05](https://github.com/jvmonjo/dietator/commit/8d6fa05fd63e5b7e0e8eb2f64140db50f63ca845))
* add `noindex, nofollow` meta tag and disallow all paths in `robots.txt`. ([2558a9d](https://github.com/jvmonjo/dietator/commit/2558a9d6ea205dc3fa790e4f9e14a26fb8cd76ba))
* add and configure PWA screenshots for mobile and desktop. ([5b72542](https://github.com/jvmonjo/dietator/commit/5b7254274a11312450bff33a2e88be9da7822638))
* add app configuration with primary and gray UI colors ([cf9c2f1](https://github.com/jvmonjo/dietator/commit/cf9c2f123df97f6d4706cd7c2c8d6fd3cd37dacc))
* add AppHeader component with navigation links and dark mode toggle. ([d394232](https://github.com/jvmonjo/dietator/commit/d394232441ab9a9ca6860b9c2bcd349f235df47b))
* add application icons and favicon assets. ([bb6bf56](https://github.com/jvmonjo/dietator/commit/bb6bf567a7b36b023a192b88e830cac96d630d61))
* Add automated release and deployment workflow with Semantic Release, including version display. ([b1d6db3](https://github.com/jvmonjo/dietator/commit/b1d6db33785925e76e4a2666fca7121adaac0ede))
* Add average hours per service display and prevent duplicate meal selections in the service form. ([565f224](https://github.com/jvmonjo/dietator/commit/565f2246b20b8f233b6215251f9b06f34028e51d))
* add color mode handling to AppHeader component ([f68f0ba](https://github.com/jvmonjo/dietator/commit/f68f0ba829dc3b9a527cad19622c9dbbcdd67fb4))
* add custom SPA loading template and `@types/node` dev dependency ([a6653c6](https://github.com/jvmonjo/dietator/commit/a6653c663289f3ef13f524db24d1b4a4a44d5894))
* add favicon ([00c812d](https://github.com/jvmonjo/dietator/commit/00c812d1b1c75ccf5b4b4cf9214ccfd30a1df7ff))
* Add month filtering to service records and update export functionality ([4122537](https://github.com/jvmonjo/dietator/commit/4122537b85ccfd1d72b5f926580e0508d77394ea))
* Add NUXT_APP_BASE_URL example to .env.example for Nuxt asset linking. ([ad9fbf2](https://github.com/jvmonjo/dietator/commit/ad9fbf217259925678c79d9ff7a6dce730b2bd12))
* Add PWA and application icons, including generation script and Nuxt configuration. ([aeb9491](https://github.com/jvmonjo/dietator/commit/aeb94910256482332a63b5185d92dcbbd2a406f5))
* Add PWA assets and update notification, integrate site logo, and simplify Nuxt PWA configuration. ([d10d2be](https://github.com/jvmonjo/dietator/commit/d10d2bed88f28f933128d7d36c39c67457f3e19d))
* add PWA manifest link and configure background color and display mode ([a7a682b](https://github.com/jvmonjo/dietator/commit/a7a682b18a71bfec42f33e959a25b5da62d95647))
* Add service management with Pinia store, form, DOCX export, and initial UI (header, stats page, global CSS). ([14239ed](https://github.com/jvmonjo/dietator/commit/14239ed6031dbe848292268294be51c2a1d92a01))
* Add service record duration validation and display total/average weekly hours statistics. ([d242b64](https://github.com/jvmonjo/dietator/commit/d242b64f41b5456dc572c32bcd2d15ef69fbaeb5))
* Add ServiceForm component for registering services with time and displacement details. ([c5f778c](https://github.com/jvmonjo/dietator/commit/c5f778c989c7568f01b82f40d64c86a04378bd4c))
* Add ServiceForm component, services store, and local location data while removing external municipality dependencies. ([b8990af](https://github.com/jvmonjo/dietator/commit/b8990af8326cbc1626e6f38c151c5385c51cfea3))
* add settings page for managing diet prices, data backups, and document templates ([f7f7d15](https://github.com/jvmonjo/dietator/commit/f7f7d15ace851c10309f1c08995ea5db28dcfeb7))
* Add short date formatting utilities and remove template location fields from settings and backup. ([fe32402](https://github.com/jvmonjo/dietator/commit/fe324020ce2312a78353624fd43beb073cc404f0))
* add SiteLogo and PwaUpdateNotification components and adjust PWA asset paths in nuxt.config. ([8835f45](https://github.com/jvmonjo/dietator/commit/8835f459c24412915f081b030915ca845825dab2))
* add SiteLogo component and update AppHeader to use it ([3b31785](https://github.com/jvmonjo/dietator/commit/3b31785a7b87dc2ba4a50fb4b4e100f62ef38416))
* Add splash loading screen, implement application header with navigation and theme toggle, and update favicon configuration. ([54dea63](https://github.com/jvmonjo/dietator/commit/54dea63ea1e85d473fbabd235d72bca9477c2e25))
* add stats page to display and manage service records with export functionality. ([7dfccf0](https://github.com/jvmonjo/dietator/commit/7dfccf009b978d1506744bbba77149ede2d6122d))
* Add Tailwind config with a custom `dietator` color palette and set it as the primary UI color. ([d974c67](https://github.com/jvmonjo/dietator/commit/d974c678695f849cb39b39bc63e5ab264a3f72c6))
* add uuid package dependency ([c602dab](https://github.com/jvmonjo/dietator/commit/c602dab88ad11cb5004dff469f023776a0f306d7))
* add validation to ensure at least one meal is selected before saving service. ([a6ecd99](https://github.com/jvmonjo/dietator/commit/a6ecd993faadc588f6727ce5ff93516aa7a66030))
* Add various application icons for different platforms and sizes. ([390b05d](https://github.com/jvmonjo/dietator/commit/390b05deb395e6c90b599560f207855321152fa6))
* Allow exporting unencrypted backups and automatically detect encrypted files during import. ([265e248](https://github.com/jvmonjo/dietator/commit/265e2482ec6b1d2b7dbd6c1f735aa74c7066eed2))
* app name in splash screen ([11650e5](https://github.com/jvmonjo/dietator/commit/11650e5ca32246736586c8adf749861d7d8f300d))
* collect and download all generated Word documents as a single ZIP archive instead of individual files. ([ce7399c](https://github.com/jvmonjo/dietator/commit/ce7399c800155fbc4d9b4119908be2b88117dd25))
* enhance backup functionality with customizable filename and import month handling ([2c82e6e](https://github.com/jvmonjo/dietator/commit/2c82e6e02b695264eb1fdc31c0310a8d079b3242))
* enhance export functionality with options for including settings and data ([a60d8c1](https://github.com/jvmonjo/dietator/commit/a60d8c10ef291687aa281439a9c69473de6c20f1))
* Enhance navigation and settings functionality with new components and state management ([268fbfa](https://github.com/jvmonjo/dietator/commit/268fbfafa8fa092187b1bc773e27857bc77863bb))
* enhance report generation with template support and validation ([55dea1f](https://github.com/jvmonjo/dietator/commit/55dea1f9bb048e1b640c630d72ba1c97beef23f0))
* enhance ServiceList and stats pages with month filtering and dynamic record handling ([3ee0ef9](https://github.com/jvmonjo/dietator/commit/3ee0ef915409ae0aa2b3bbff9dd3ac60cbcd28f3))
* Implement backup and restore functionality with encryption and decryption ([fed6524](https://github.com/jvmonjo/dietator/commit/fed652461dda0da0d8b248e044e71c85fb197d08))
* implement custom modal for service creation/editing, refactor location select options, and add related styling fixes ([8b8e321](https://github.com/jvmonjo/dietator/commit/8b8e32163d40298eaf5b6777fec59e2dca6161d0))
* Implement dynamic SPA loading icon path resolution for base URLs and update CI/CD build output directories. ([ee7723b](https://github.com/jvmonjo/dietator/commit/ee7723b089fd78d28925acd64c5d93ba6cbec976))
* Implement PWA update notification UI and logic, and enhance date formatting utility. ([8f28c93](https://github.com/jvmonjo/dietator/commit/8f28c93b0c8fa537e680694ae3ab469d8738b111))
* Implement service duplication and perform minor UI/SVG updates. ([b04f39f](https://github.com/jvmonjo/dietator/commit/b04f39f7c61aed5bb23fee8810aa605960cea0c0))
* Implement service statistics functionality with month filtering and totals calculation ([81a28ab](https://github.com/jvmonjo/dietator/commit/81a28ab123bee7e610885184da2530a85597a9a7))
* initial project setup for the Dietator application, including core Nuxt 4 structure, UI components, and service tracking features. ([dec9179](https://github.com/jvmonjo/dietator/commit/dec917942c82d4fb6c733d0ceb168a9ab9b332f7))
* Introduce `useServiceWarnings` composable to display multiple service record warnings in the form and list. ([7702fe7](https://github.com/jvmonjo/dietator/commit/7702fe7ca13b60b502d7ffb574018d6b929993a3))
* Introduce settings page for managing prices, templates, and encrypted data backup/restore. ([ea096e2](https://github.com/jvmonjo/dietator/commit/ea096e2b9c2199d29f986a281eda9f190a7ce693))
* Refactor service management with enhanced settings, service list, and improved form handling ([22aef25](https://github.com/jvmonjo/dietator/commit/22aef253ba7af37fc4369a802e9ac72c52d5ec6d))
* remove statistics link and update month selection display in index page ([b26052b](https://github.com/jvmonjo/dietator/commit/b26052b4533b905c451ce5e0aede700da7d995c3))
* remove stats page and clean up related settings and export logic ([433e2c7](https://github.com/jvmonjo/dietator/commit/433e2c777c05a0839f81f389530814444ab7061e))
* restructure app configuration and enhance Tailwind CSS theme colors ([204c552](https://github.com/jvmonjo/dietator/commit/204c552a0ad354866c3718c5e712aa4cbf172519))
* update date formatting in report generation and documentation ([a548cdb](https://github.com/jvmonjo/dietator/commit/a548cdb8177047cbc55ee2d732fa716ecaf83a4e))
* update PWA registerType from autoUpdate to prompt ([19ba52e](https://github.com/jvmonjo/dietator/commit/19ba52e13bf18ad2e6c7a40ce2240bf12123eabd))
* update site logo SVG with a new design and gradient definition. ([a4ef6f3](https://github.com/jvmonjo/dietator/commit/a4ef6f371fe23e89fb3c777907c042ce1e8f0138))
