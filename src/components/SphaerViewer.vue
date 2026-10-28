<script setup lang="ts">
import { ref, useTemplateRef, watch } from 'vue'
import { storeToRefs } from 'pinia'
import type { Coordinates } from '@optica/core'
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuSeparator, ContextMenuTrigger,
} from '@optica/core/ui/context-menu'
import { ImageViewer } from '@optica/core/ui/image-viewer'
import { ProjectLoader } from '@optica/core/ui/project-loader'
import type { SphaerLandmark } from '@/data/annotations'
import { getRepository } from '@/data/setup'
import { useSphaerStore } from '@/lib/stores'

const store = useSphaerStore()
const { acquisition, annotations, selectedImage } = storeToRefs(store)

async function loadProject() {
  const project = await getRepository().getImages(store.objectPath)
  store.project = project
  return project
}

// reproject the landmarks on each new view, and when their position changes
watch(() => [selectedImage.value?.name, annotations.value?.landmarks.map((landmark) => landmark.version)], () => {
  if (selectedImage.value) {
    store.refreshReprojections(selectedImage.value.name)
  }
}, { immediate: true })

// the reprojections are not props of the viewer: redraw when they arrive
const viewer = useTemplateRef('viewer')
watch(() => store.reprojections, () => viewer.value?.update(), { deep: true })

function markerPosition(landmark: SphaerLandmark): Coordinates | undefined {
  return selectedImage.value ? store.markerOf(landmark, selectedImage.value.name) : undefined
}

// black: posed on this view, white: reprojected
function markerStroke(landmark: SphaerLandmark): string {
  return selectedImage.value && landmark.poses.has(selectedImage.value.name) ? 'black' : 'white'
}

// what the right click was on
const menuPos = ref<Coordinates>({ x: 0, y: 0 })
const menuLandmark = ref<SphaerLandmark | null>(null)

function openMenu(pos: Coordinates, landmark: SphaerLandmark | null) {
  menuPos.value = pos
  // only a pose of this view can be deleted, not a reprojection
  menuLandmark.value = (landmark && selectedImage.value && landmark.poses.has(selectedImage.value.name)) ? landmark : null
}

// a landmark dragged on a view is posed there, a reprojected one too
function move(landmark: SphaerLandmark, pos: Coordinates) {
  store.placeLandmark(landmark, pos)
}
</script>

<template>
  <ProjectLoader :load="loadProject" :query-key="['project', store.objectPath]">
    <div v-if="acquisition && annotations && selectedImage" class="w-full h-full flex flex-col items-center">
      <ContextMenu>
        <ContextMenuTrigger class="flex w-full h-full">
          <ImageViewer ref="viewer" class="object-fit" :image="selectedImage" :size="acquisition.sizeOf()"
            :camera="acquisition.camera" :landmarks="annotations.landmarks" context-menu fit-on-image-change
            :marker-position="markerPosition" :marker-stroke="markerStroke" @move="move" @contextmenu="openMenu" />
        </ContextMenuTrigger>
        <ContextMenuContent class="w-64">
          <ContextMenuLabel>Place landmark</ContextMenuLabel>
          <ContextMenuSeparator />
          <ContextMenuItem v-for="landmark in annotations.landmarks" :key="landmark.id" class="block" inset
            @select="store.placeLandmark(landmark as SphaerLandmark, menuPos)">
            <div class="flex space-x-2 items-center">
              <svg class="h-4 w-4" viewBox="0 0 8 8" stroke="currentColor" stroke-width="1"
                :fill="landmark.getColorHEX()" xmlns="http://www.w3.org/2000/svg">
                <circle cx="4" cy="4" r="3" />
              </svg>
              <div class="flex items-center">{{ landmark.label }}</div>
            </div>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem class="block" inset @select="store.addLandmark(menuPos)">
            Add Landmark
          </ContextMenuItem>
          <template v-if="menuLandmark">
            <ContextMenuSeparator />
            <ContextMenuItem @select="store.removePose(menuLandmark as SphaerLandmark)">
              <div class="flex space-x-4 items-center">
                <span class="inline-block align-middle font-bold">Delete :</span>
                <div class="flex space-x-2 items-center">
                  <svg class="h-4 w-4" viewBox="0 0 8 8" stroke="currentColor" stroke-width="1"
                    :fill="menuLandmark.getColorHEX()" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="4" cy="4" r="3" />
                  </svg>
                  <span class="inline-flex items-center align-middle">{{ menuLandmark.label }}</span>
                </div>
              </div>
            </ContextMenuItem>
          </template>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  </ProjectLoader>
</template>

<style scoped>
.object-fit {
  object-fit: contain;
  max-width: 100%;
  max-height: 100%;
  width: 100%;
  height: 100%;
  display: block;
}
</style>
