<script setup lang="ts">
import { usePersistedAnnotations } from 'optica-core'
import { Separator } from 'optica-core/ui/separator'
import { MainLogo } from '@/components/logo'
import Sidebar from '@/components/Sidebar.vue'
import SphaerMenu from '@/components/SphaerMenu.vue'
import SphaerViewer from '@/components/SphaerViewer.vue'
import { useSettingsStore, useSphaerStore } from '@/lib/stores'

const settingsStore = useSettingsStore()
const store = useSphaerStore()

const urlParams = new URLSearchParams(window.location.search)
store.setPath(urlParams.get('series') ?? "")

// the annotations survive a reload (sessionStorage, by series)
usePersistedAnnotations(() => store.project)
</script>

<template>
  <main class="h-screen">
    <div class="flex menu">
      <SphaerMenu class="sticky top-0 flex flex-row grow z-50" />
      <div class="flex items-center space-x-2 pr-2">
        <MainLogo :height=30 :width=30 />
        <h1 class="font-dejavu font-bold text-brand">Sphaeroptica</h1>
      </div>
    </div>
    <Separator />
    <div v-if="store.objectPath" class="rest_height flex" :class="settingsStore.isLeft ? 'flex-row' : 'flex-row-reverse'">
      <div class="h-full w-1/4 flex-none overflow-auto border p-4">
        <Sidebar />
      </div>
      <div class="h-full flex-auto items-center justify-center">
        <SphaerViewer />
      </div>
    </div>
    <div v-else class="rest_height flex justify-center items-center text-4xl text-red-600 dark:text-red-400">
      Error 404 : please select a valid URL (?series=&lt;object&gt;)
    </div>
  </main>
</template>

<style scoped>
.menu {
  height: 40px;
}

.rest_height {
  height: calc(100% - 41px);
}
</style>
