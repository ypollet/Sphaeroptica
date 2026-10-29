import { defineStore } from 'pinia'
import type { Coordinates, Project } from 'optica-core'
import { SphaerLandmark, type SphaerAnnotations } from '@/data/annotations'
import type { SphaerAcquisition, SphereImage } from '@/data/sphere'
import { getRepository } from '@/data/setup'

export const useSettingsStore = defineStore('settings', {
  state: () => ({ isLeft: false }),
  actions: {
    useToggleLeft(value: boolean) {
      this.isLeft = value
    },
  },
  persist: {
    storage: localStorage,
    key: 'settings',
  }
})

// where a landmark of a given version is seen on an image
type Reprojection = { version: number, pos: Coordinates }

// reprojections being computed, "<image>|<landmark>|<version>"
const pending = new Set<string>()

// The project holds the views, the camera and the annotations of the sphere.
// Its annotations are saved by usePersistedAnnotations (ViewerView).
export const useSphaerStore = defineStore('sphaer', {
  state: () => ({
    objectPath: "",
    project: null as Project<SphereImage, SphaerAcquisition> | null,
    // by image name, then by landmark id
    reprojections: new Map<string, Map<string, Reprojection>>(),
  }),
  getters: {
    acquisition: (state) => state.project?.acquisition ?? null,
    annotations(): SphaerAnnotations | null {
      return this.acquisition?.annotations ?? null
    },
    selectedImage(): SphereImage | null {
      return this.acquisition?.selectedImage ?? null
    },
  },
  actions: {
    setPath(path: string) {
      this.$reset()
      this.objectPath = path
    },

    // where the landmark is drawn on an image: its pose there, else its reprojection
    markerOf(landmark: SphaerLandmark, image: string): Coordinates | undefined {
      const pose = landmark.poses.get(image)
      if (pose) {
        return pose
      }
      const reprojection = this.reprojections.get(image)?.get(landmark.id)
      return (reprojection && reprojection.version == landmark.version) ? reprojection.pos : undefined
    },

    // compute the missing or stale reprojections of the landmarks on an image
    refreshReprojections(image: string) {
      if (!this.reprojections.has(image)) {
        this.reprojections.set(image, new Map())
      }
      // read back from the store: the reactive map
      const cache = this.reprojections.get(image)!
      this.annotations?.landmarks.forEach((landmark) => {
        const cached = cache.get(landmark.id)
        if (landmark.position == undefined) {
          cache.delete(landmark.id)
          return
        }
        const key = `${image}|${landmark.id}|${landmark.version}`
        if ((cached && cached.version == landmark.version) || pending.has(key)) {
          return
        }
        pending.add(key)
        const version = landmark.version
        getRepository().reproject(this.objectPath, image, landmark.position)
          .then((pos) => this.reprojections.get(image)?.set(landmark.id, { version, pos }))
          .catch((error) => console.error(error))
          .finally(() => pending.delete(key))
      })
    },

    // triangulate again after a change of the poses, the position is lost under two poses
    async updatePosition(landmark: SphaerLandmark) {
      if (!landmark.triangulable) {
        landmark.setPosition(undefined)
        return
      }
      const poses = JSON.stringify(Object.fromEntries(landmark.poses))
      try {
        const position = await getRepository().triangulate(this.objectPath, landmark.poses)
        // ignore the answer when the poses changed meanwhile
        if (poses == JSON.stringify(Object.fromEntries(landmark.poses))) {
          landmark.setPosition(position)
        }
      } catch (error) {
        console.error(error)
      }
    },

    // a new landmark, posed on the shown image only: no position yet
    addLandmark(pos: Coordinates) {
      const image = this.selectedImage
      const annotations = this.annotations
      if (!image || !annotations) {
        return
      }
      const id = annotations.generateID()
      const landmark = new SphaerLandmark(id, id)
      landmark.addPose(image.name, pos)
      annotations.landmarks.push(landmark)
    },

    // pose a landmark on the shown image (context menu, end of a drag)
    async placeLandmark(landmark: SphaerLandmark, pos: Coordinates) {
      const image = this.selectedImage
      if (!image) {
        return
      }
      landmark.addPose(image.name, pos)
      await this.updatePosition(landmark)
    },

    async removePose(landmark: SphaerLandmark) {
      const image = this.selectedImage
      if (!image) {
        return
      }
      landmark.removePose(image.name)
      await this.updatePosition(landmark)
    },
  },
})
