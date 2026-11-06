<script setup lang="ts">
import { downloadCSV, downloadJSON, exportFilename } from 'optica-core'
import { AppMenu } from 'optica-core/ui/app-menu'
import { useSettingsStore, useSphaerStore } from '@/lib/stores'
import { Credits } from '@/components/credits'

const settingsStore = useSettingsStore()
const store = useSphaerStore()

// one acquisition: the annotations of the sphere, in the format of the old Sphaeroptica
function exportAnnotations(format: "csv" | "json") {
  const annotations = store.annotations
  if (!annotations) {
    return
  }
  if (format == "csv") {
    downloadCSV([annotations.csvHeader(), ...annotations.toCSVRows()], exportFilename("sphaer", store.objectPath, "csv"))
  } else {
    downloadJSON(annotations.toJSON(), exportFilename("sphaer", store.objectPath, "json"))
  }
}

// these files, the ones of the old Sphaeroptica, or annotations by acquisition.
// The landmarks posed on two images but without a position are triangulated again
function importAnnotations(content: string) {
  if (!store.project) {
    return
  }
  try {
    store.project.importAnnotations(JSON.parse(content))
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
    <template #credits>
      <Credits />
    </template>
  </AppMenu>
</template>
