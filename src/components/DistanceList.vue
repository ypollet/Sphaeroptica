<script setup lang="ts">
import * as math from "mathjs"
import { PhX } from "@phosphor-icons/vue"
import { Button } from "optica-core/ui/button"
import { Input } from "optica-core/ui/input"
import { Label } from "optica-core/ui/label"
import { Separator } from "optica-core/ui/separator"
import type { SphaerAnnotations, SphaerDistance } from "@/data/annotations"

const STEP = 0.01

// Distances between two landmarks: their label and length. Typing a length calibrates all of them.
const props = defineProps<{
  annotations: SphaerAnnotations
}>()

function changeLabel(payload: string | number, distance: SphaerDistance) {
  distance.label = payload.toString()
}

function changeLength(payload: string | number, distance: SphaerDistance) {
  props.annotations.calibrate(distance, math.number(payload))
}
</script>

<template>
  <div class="flex h-48 overflow-auto max-w-full flex-col border">
    <div v-for="(distance, index) in annotations.distances" :key="index" class="flex flex-col w-full h-10">
      <div class="flex flex-row items-center justify-start space-x-3 px-3 w-full h-full">
        <span class="flex-none h-3 w-3 rounded-full border" :style="{ background: distance.left.getColorHEX() }" />
        <span class="flex-none h-3 w-3 rounded-full border" :style="{ background: distance.right.getColorHEX() }" />
        <Label v-show="!distance.edit_label" class="flex whitespace-nowrap w-36" @dblclick="distance.edit_label = true">
          {{ distance.label }}
        </Label>
        <Input v-show="distance.edit_label" type="text" :model-value="distance.label" class="flex h-auto w-36 px-0"
          @focusout="distance.edit_label = false" @keyup.enter="distance.edit_label = false"
          @update:model-value="changeLabel($event, distance as SphaerDistance)" />
        <span>:</span>
        <Label v-show="!distance.edit_distance" class="flex whitespace-nowrap w-36"
          :title="distance.length == undefined ? 'Both landmarks need a position (posed on two views)' : undefined"
          @dblclick="distance.edit_distance = true">
          {{ annotations.scaled(distance.length) }} {{ annotations.scale }}
        </Label>
        <Input v-show="distance.edit_distance" type="number" :min="0" :step="STEP"
          :model-value="annotations.scaled(distance.length)" class="flex h-auto w-36 px-0"
          @focusout="distance.edit_distance = false" @keyup.enter="distance.edit_distance = false"
          @update:model-value="changeLength($event, distance as SphaerDistance)" />
        <Button class="relative flex-none w-6 h-6 p-0" variant="destructive" @click="annotations.removeDistance(index)">
          <PhX class="relative w-4 h-4 p-0" />
        </Button>
      </div>
      <Separator class="w-full" />
    </div>
  </div>
</template>
