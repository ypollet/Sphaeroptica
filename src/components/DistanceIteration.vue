<script setup lang="ts">
import { PhX } from "@phosphor-icons/vue"
import { Button } from "optica-core/ui/button"
import { LabelInput } from "optica-core/ui/input"
import type { SphaerAnnotations, SphaerDistance } from "@/data/annotations"

const STEP = 0.01

// A distance between two landmarks on one line: its label and length. Typing a length calibrates all of them.
defineProps<{
  distance: SphaerDistance
  annotations: SphaerAnnotations
}>()

const emit = defineEmits<{
  // the delete button
  delete: []
}>()
</script>

<template>
  <div class="flex flex-row items-center justify-start space-x-3 px-3 w-full h-full">
    <span class="flex-none h-3 w-3 rounded-full border" :style="{ background: distance.left.getColorHEX() }" />
    <span class="flex-none h-3 w-3 rounded-full border" :style="{ background: distance.right.getColorHEX() }" />
    <LabelInput v-model="distance.label" class="flex whitespace-nowrap w-36" input-class="flex h-auto w-36 px-0" />
    <span>:</span>
    <LabelInput :model-value="annotations.scaled(distance.length)" type="number" :min="0" :step="STEP"
      class="flex whitespace-nowrap w-36" input-class="flex h-auto w-36 px-0"
      @update:model-value="(length) => annotations.calibrate(distance, length)">
      <span :title="distance.length == undefined ? 'Both landmarks need a position (posed on two views)' : undefined">
        {{ annotations.scaled(distance.length) }} {{ annotations.scale }}
      </span>
    </LabelInput>
    <Button class="relative flex-none w-6 h-6 p-0" variant="destructive" @click="emit('delete')">
      <PhX class="relative w-4 h-4 p-0" />
    </Button>
  </div>
</template>
