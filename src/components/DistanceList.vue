<script setup lang="ts">
import { Separator } from "optica-core/ui/separator"
import type { SphaerAnnotations } from "@/data/annotations"
import DistanceIteration from "./DistanceIteration.vue"

// Distances between two landmarks, one per line
defineProps<{
  annotations: SphaerAnnotations
}>()
</script>

<template>
  <div class="flex h-48 overflow-auto max-w-full flex-col border">
    <div v-for="(distance, index) in annotations.distances" :key="index" class="flex flex-col w-full h-10">
      <DistanceIteration :distance="distance" :annotations="annotations" @delete="annotations.removeDistance(index)" />
      <Separator class="w-full" />
    </div>
  </div>
</template>
