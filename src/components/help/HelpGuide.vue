<script setup lang="ts">
import { PhArrowCounterClockwise, PhMouseLeftClick, PhMouseRightClick, PhX } from '@phosphor-icons/vue'
import { HelpGuide, HelpSection, ManagingHelp, MeasuresHelp, MenusHelp, NavigationHelp } from 'optica-core/ui/help-guide'
</script>

<template>
  <HelpGuide app-name="Sphaeroptica">
    <template #about>
      <p>Sphaeroptica shows a specimen through calibrated images taken from many points of view all around it: the
        position of the camera is known for each image.</p>
      <p>A landmark placed on at least two views gets its 3D position, so distances can be measured between points
        of the specimen in 3D.</p>
    </template>

    <NavigationHelp>
      <li>
        <PhMouseLeftClick class="inline h-5 w-5 align-text-bottom" weight="fill" /> Drag the thumbnail: turns around
        the specimen, the view closest to that direction is shown
      </li>
      <li>
        <strong>Shortcuts</strong> (TOP, LEFT, FRONT, RIGHT, BACK, BOT): go straight to that side of the specimen, if
        it was set during the calibration
      </li>
      <li>
        Above the thumbnail: the direction you are looking from (longitude, latitude) and the zoom. Under it: the
        direction of the shown view
      </li>
    </NavigationHelp>

    <HelpSection title="How it works">
      <li>Every view is a photo taken from a known position on a sphere around the specimen</li>
      <li>
        A landmark is placed on several views. Once it is on <strong>two views</strong>, its 3D position is computed
        (triangulated) from them, each other view adds precision
      </li>
      <li>
        Once a landmark has a 3D position, it is also shown on the other views where it should be (reprojected):
        <ul class="mt-1 list-[circle] pl-5 space-y-1">
          <li><strong>black outline</strong>: placed on this view</li>
          <li><strong>white outline</strong>: reprojected, not placed on this view</li>
        </ul>
      </li>
      <li>The sidebar shows on how many views each landmark is placed</li>
    </HelpSection>

    <HelpSection title="Drawing annotations">
      <li>
        <PhMouseRightClick class="inline h-5 w-5 align-text-bottom" weight="fill" /> Right Click on the image opens
        a menu:
        <ul class="mt-1 list-[circle] pl-5 space-y-1">
          <li><strong>Add Landmark</strong>: a new landmark, placed on this view only</li>
          <li><strong>A landmark of the list</strong>: places it here on this view (or moves it if it already was)</li>
          <li><strong>Delete</strong> (on a landmark placed on this view): removes it from this view only</li>
        </ul>
      </li>
      <li>
        <PhMouseLeftClick class="inline h-5 w-5 align-text-bottom" weight="fill" /> Left Click on a landmark: drag to
        move it. Dragging a reprojected landmark places it on this view
      </li>
      <li>
        <strong>Distances</strong>: <PhMouseLeftClick class="inline h-5 w-5 align-text-bottom" weight="fill" /><span
          class="text-xs font-bold">x2</span> on two landmarks of the list (not on their names) to select them, then
        <PhMouseRightClick class="inline h-5 w-5 align-text-bottom" weight="fill" /> Right Click on the list:
        <strong>Create Distance</strong>. Selecting a third landmark unselects the first one
      </li>
    </HelpSection>

    <ManagingHelp :types="['landmarks']">
      <li>
        <PhArrowCounterClockwise class="inline h-5 w-5 align-text-bottom" /> removes the landmark from every view, it
        stays in the list
      </li>
      <li>
        <span class="inline-flex items-center justify-center h-5 w-5 align-text-bottom rounded-md bg-destructive text-white">
          <PhX class="h-3.5 w-3.5" />
        </span>
        on a landmark also deletes its distances
      </li>
    </ManagingHelp>

    <MeasuresHelp :types="['landmarks']">
      <template #intro>
        <li>All values are in 3D: they come from the triangulated positions of the landmarks</li>
      </template>
      <li><strong>Distance</strong>: the straight 3D distance between its two landmarks, once both have a position</li>
      <li>
        <strong>Calibration</strong>: <PhMouseLeftClick class="inline h-5 w-5 align-text-bottom" weight="fill" /><span
          class="text-xs font-bold">x2</span> on the length of a distance and type its known real length: every
        distance is scaled to match. <strong>Reset Scale</strong> goes back to the scale of the camera calibration
      </li>
      <li>Values are shown in the unit chosen in the scale selector (m, cm, mm, µm...)</li>
    </MeasuresHelp>

    <MenusHelp>
      <li>The CSV export only has the landmarks with a 3D position</li>
    </MenusHelp>
  </HelpGuide>
</template>
