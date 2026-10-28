<script setup lang="ts">
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { round } from 'mathjs'
import { PhArrowCounterClockwise } from '@phosphor-icons/vue'
import { SCALE_UNITS } from '@optica/core'
import { Button } from '@optica/core/ui/button'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@optica/core/ui/context-menu'
import { Label } from '@optica/core/ui/label'
import { LandmarkList } from '@optica/core/ui/landmark'
import { SelectScale } from '@optica/core/ui/select-scale'
import { ImageOverview } from '@optica/core/ui/image-overview'
import type { SphaerLandmark } from '@/data/annotations'
import type { SphereCoordinates } from '@/data/sphere'
import { getRepository } from '@/data/setup'
import { useSphaerStore } from '@/lib/stores'
import DistanceList from './DistanceList.vue'

const store = useSphaerStore()
const { acquisition, annotations, selectedImage } = storeToRefs(store)

// the positions are physical: no px
const units = SCALE_UNITS.filter((unit) => unit != "px")

// named views of the object, sent by the backend
const shortcuts = ref<Record<string, SphereCoordinates>>({})
watch(() => store.objectPath, (objectPath) => {
  shortcuts.value = {}
  getRepository().getShortcuts(objectPath)
    .then((value) => shortcuts.value = value)
    .catch((error) => console.error(error))
}, { immediate: true })

// key of the shortcut in calibration.json -> button, on a cross
const SHORTCUTS = [
  { key: "SUPERIOR", label: "TOP", class: "col-start-2" },
  { key: "LEFT", label: "LEFT", class: "col-start-1" },
  { key: "FRONT", label: "FRONT", class: "" },
  { key: "RIGHT", label: "RIGHT", class: "" },
  { key: "POST", label: "BACK", class: "" },
  { key: "INFERIOR", label: "BOT", class: "col-start-2" },
]

function goTo(key: string) {
  const coordinates = shortcuts.value[key]
  if (coordinates) {
    acquisition.value?.setCoordinates(coordinates)
  }
}

// drag on the thumbnail: turn around the object
function rotate(movement: { x: number, y: number }) {
  acquisition.value?.moveLongitude(movement.x * 180)
  acquisition.value?.moveLatitude(movement.y * 180)
}

// the menu of the list only opens with two landmarks selected
function checkSelection(event: MouseEvent) {
  if (!annotations.value?.selection.fullSelected()) {
    event.preventDefault()
  }
}
</script>

<template>
  <div class="flex flex-col pb-[12px] w-full">
    <template v-if="acquisition && selectedImage">
      <h2 class="mb-2 px-4 text-center font-semibold tracking-tight">
        Camera Viewer ({{ round(acquisition.coordinates.longitude) }}°, {{ round(acquisition.coordinates.latitude) }}°) :
        {{ round(acquisition.camera.zoom * 100) }}%
      </h2>
      <!-- drag the thumbnail to turn around the object -->
      <ImageOverview :image="selectedImage" :size="acquisition.sizeOf()" :camera="acquisition.camera"
        thumbnail-class="cursor-grab" @drag="rotate" :counter="`(${selectedImage.coordinates.longitude.toFixed(2)}°, ${selectedImage.coordinates.latitude.toFixed(2)}°) `" />
    </template>

    <div v-if="annotations" class="space-y-4 py-4">
      <div class="px-3 py-2">
        <h2 class="mb-2 px-4 text-lg font-semibold tracking-tight">Shortcuts</h2>
        <div class="grid grid-cols-4 gap-1">
          <Button v-for="shortcut in SHORTCUTS" :key="shortcut.key" variant="secondary"
            class="w-full justify-center" :class="shortcut.class" :disabled="!shortcuts[shortcut.key]"
            @click="goTo(shortcut.key)">
            {{ shortcut.label }}
          </Button>
        </div>
      </div>

      <div class="px-3 py-2">
        <h2 class="relative px-4 text-lg font-semibold tracking-tight">Landmarks</h2>
        <p class="px-4 pb-2 text-sm text-muted-foreground">
          Double click two landmarks, then right click to create a distance.
        </p>
        <ContextMenu>
          <ContextMenuTrigger class="flex w-full h-full">
            <LandmarkList v-model="annotations.landmarks" class="h-96"
              :highlighted="(landmark) => annotations?.selection.selected(landmark.id) ?? false"
              @activate="(landmark) => annotations?.toggleSelection(landmark.id)"
              @remove="(id) => annotations?.removeLandmark(id)" @contextmenu="checkSelection">
              <template #info="{ landmark }">
                <Label class="whitespace-nowrap text-muted-foreground"
                  :title="landmark.position ? 'Triangulated' : 'Needs a pose on two views'">
                  {{ landmark.poses.size }} {{ landmark.poses.size > 1 ? 'views' : 'view' }}
                </Label>
              </template>
              <template #actions="{ landmark }">
                <Button class="w-6 h-6 p-0" variant="secondary" title="Remove its poses"
                  @click="(landmark as SphaerLandmark).resetPoses()">
                  <PhArrowCounterClockwise class="relative w-4 h-4 p-0" />
                </Button>
              </template>
            </LandmarkList>
          </ContextMenuTrigger>
          <ContextMenuContent class="w-64">
            <ContextMenuItem class="block" inset @select="annotations.addSelectedDistance()">
              Create Distance
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </div>

      <div class="px-3 py-2">
        <div class="flex flex-row items-center">
          <h2 class="relative px-4 text-lg font-semibold tracking-tight">Distances</h2>
          <div class="w-full h-full flex justify-end items-center space-x-2">
            <SelectScale v-model="annotations.scale" :units="units" />
            <Button variant="secondary" @click="annotations.resetScale()">Reset Scale</Button>
          </div>
        </div>
        <DistanceList class="mt-2" :annotations="annotations" />
      </div>
    </div>
  </div>
</template>
