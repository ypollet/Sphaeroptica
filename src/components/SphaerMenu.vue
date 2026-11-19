<script setup lang="ts">
import { annotationsFile, downloadCSV, downloadJSON, exportFilename } from 'optica-core'
import { Scale } from '@/data/annotations'
import { AppMenu } from 'optica-core/ui/app-menu'
import { useSettingsStore, useSphaerStore } from '@/lib/stores'
import { Credits } from '@/components/credits'
import { HelpGuide } from '@/components/help'

const settingsStore = useSettingsStore()
const store = useSphaerStore()

// one acquisition: the annotations of the sphere (CSV), or the annotations file
function exportAnnotations(format: "csv" | "json") {
  const annotations = store.annotations
  if (!annotations) {
    return
  }
  if (format == "csv") {
    downloadCSV([annotations.csvHeader(), ...annotations.toCSVRows()], exportFilename("sphaer", store.objectPath, "csv"))
  } else {
    downloadJSON(annotationsFile(store.project!, "sphaeroptica"), exportFilename("sphaer", store.objectPath, "json"))
  }
}

// the exported files, current or older (the old Sphaeroptica ones too, upgraded by readAnnotationsFile).
// The landmarks posed on two images but without a position are triangulated again
function importAnnotations(content: string) {
  if (!store.project) {
    return
  }
  try {
    store.project.importAnnotationsFile(JSON.parse(content), { viewer: "sphaeroptica", scales: Scale })
    store.recomputePositions()
  } catch (error) {
    console.error("Annotations not imported:", error)
  }
}
</script>

<template>
  <AppMenu :reverse="settingsStore.isLeft" @update:reverse="settingsStore.useToggleLeft" app-name="Sphaeroptica"
    :importable="store.project != null" :exportable="store.project != null"
    @export="exportAnnotations" @import="importAnnotations">
    <template #help-guide>
      <HelpGuide />
    </template>
    <template #credits>
      <Credits />
    </template>
  </AppMenu>
</template>
