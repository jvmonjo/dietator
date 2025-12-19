1) Instal·la dependències
npm i -D semantic-release \
  @semantic-release/commit-analyzer \
  @semantic-release/release-notes-generator \
  @semantic-release/changelog \
  @semantic-release/git \
  @semantic-release/github

2) Configura semantic-release

Crea .releaserc.json:

{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    ["@semantic-release/changelog", { "changelogFile": "CHANGELOG.md" }],
    ["@semantic-release/git", {
      "assets": ["CHANGELOG.md", "package.json", "package-lock.json"],
      "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
    }],
    "@semantic-release/github"
  ]
}


Açò: mira els commits des de l’últim tag, decideix major/minor/patch, genera notes, actualitza CHANGELOG.md, commiteja i crea el GitHub Release.

3) Obliga un format de commits

Exemples:

fix: arregla login → patch

feat: afegeix exportació PDF → minor

feat!: canvia API + footer BREAKING CHANGE: → major

Si vols, afegeix commitlint, però no és imprescindible.

4) Workflow de Release + Deploy a GitHub Pages
Tin en compte que ja tenim un workflow de deploy a GitHub Pages i que hi haurà que fusionar amb el nostre workflow de release.

/.github/workflows/release-and-deploy.yml:

name: Release and Deploy

on:
  push:
    branches: [main]

permissions:
  contents: write
  issues: write
  pull-requests: write
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  release:
    runs-on: ubuntu-latest
    outputs:
      released: ${{ steps.sr.outputs.new_release_published }}
      version: ${{ steps.sr.outputs.new_release_version }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - name: Semantic Release
        id: sr
        uses: cycjimmy/semantic-release-action@v4
        with:
          semantic_version: 23
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  build_and_deploy:
    needs: release
    if: needs.release.outputs.released == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - name: Build (Nuxt generate)
        run: |
          export NUXT_PUBLIC_APP_VERSION="${{ needs.release.outputs.version }}"
          npm run generate

      # Ajusta el path si el teu output és diferent
      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: .output/public

      - name: Deploy to GitHub Pages
        uses: actions/deploy-pages@v4


Nota important: el path pot variar segons configuració. En Nuxt sol ser .output/public quan fas generate. Si el teu projecte trau dist/, canvia-ho.

Mostrar la versió dins Nuxt 4
A) Injecta-la a runtime config

En nuxt.config.ts:

export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      appVersion: process.env.NUXT_PUBLIC_APP_VERSION || 'dev'
    }
  }
})


En qualsevol component (p. ex. un footer):

<script setup lang="ts">
const { public: { appVersion } } = useRuntimeConfig()
</script>

<template>
  <span class="text-xs opacity-60">v{{ appVersion }}</span>
</template>


Això farà que en local diga dev i en release diga vX.Y.Z.