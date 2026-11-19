import Color from "color"
import * as math from "mathjs"
import {
    DequeMax2, isFiniteNumber, isRecord, isScaleUnit, randomColorRGB, randomID, readColor, readItem, readLabel, readList, readRecord,
    type AnnotationsSet, type Coordinates, type ScaleUnit,
} from "optica-core"

const ROUNDING = 5

// Unlike the core Scale (mm = 1), the positions of the calibration are read in m
export const Scale: Record<ScaleUnit, number> = {
    px: 1,
    m: 1,
    dm: 0.1,
    cm: 0.01,
    mm: 0.001,
    µm: 0.000001,
    nm: 0.000000001,
}

// Saved form of a landmark: the format of the first Sphaeroptica exports
export type LandmarkJSON = {
    label: string
    color: string
    // homogeneous [x, y, z, 1], missing until it is posed on two images
    position?: number[] | null
    // pose on each image, by image name
    poses: Record<string, Coordinates>
}

export type DistanceJSON = {
    label: string
    left: string
    right: string
}

// Saved form of the annotations, in the acquisitions of an AnnotationsFile (export, import and persistence;
// the exports made before it are upgraded by readAnnotationsFile with this Scale). Every field may be missing:
// only the present ones are read. scale.factor: the size of the unit in meters
export type AnnotationsJSON = {
    scaleFactor?: number
    scale?: { unit: ScaleUnit, factor: number }
    landmarks?: Record<string, LandmarkJSON>
    distances?: DistanceJSON[]
}

// A point of the object, posed on any number of views. Its 3D position is triangulated
// from its poses as soon as it has two of them.
export class SphaerLandmark {
    id: string
    label: string
    color: Color
    poses: Map<string, Coordinates>
    position: number[] | undefined
    // incremented on each change of the position: the reprojections of an older version are stale
    version: number
    show: boolean

    constructor(id: string, label: string, color: Color | null = null, poses: Map<string, Coordinates> = new Map(), position: number[] | undefined = undefined) {
        this.id = id
        this.label = label
        this.color = color || Color.rgb(randomColorRGB())
        this.poses = poses
        this.position = position
        this.version = 1
        this.show = true
    }

    equals(other: SphaerLandmark | string | null | undefined) {
        if (other == null) {
            return false
        }
        return this.id == (typeof other === "string" ? other : other.id)
    }

    getColorHEX(): string {
        return this.color.hex()
    }
    setColorHEX(color: string) {
        this.color = Color(color)
    }

    addPose(image: string, pose: Coordinates) {
        this.poses.set(image, pose)
    }
    removePose(image: string) {
        this.poses.delete(image)
    }
    resetPoses() {
        this.poses = new Map()
        this.setPosition(undefined)
    }

    // a position needs poses on two images
    get triangulable(): boolean {
        return this.poses.size >= 2
    }

    setPosition(position: number[] | undefined) {
        this.position = position
        this.version++
    }

    toJSON(): LandmarkJSON {
        return { label: this.label, color: this.getColorHEX(), position: this.position, poses: Object.fromEntries(this.poses) }
    }

    // a saved landmark: its poses that can be read, a random color when it has none, and no position when
    // it can't be read (triangulated again from the poses, see recomputePositions)
    static fromJSON(id: string, object: LandmarkJSON | Record<string, any>): SphaerLandmark {
        const poses = Object.entries(readRecord(object.poses, "poses"))
            .filter((entry): entry is [string, Coordinates] => isRecord(entry[1]) && isFiniteNumber(entry[1].x) && isFiniteNumber(entry[1].y))
            .map(([image, pose]) => [image, { x: pose.x, y: pose.y }] as [string, Coordinates])
        const position = Array.isArray(object.position) && object.position.length >= 3 && object.position.every(isFiniteNumber)
            ? object.position as number[] : undefined
        return new SphaerLandmark(id, readLabel(object.label, id), readColor(object.color), new Map(poses), position)
    }
}

// Distance between two landmarks, measured between their 3D positions
export class SphaerDistance {
    label: string
    left: SphaerLandmark
    right: SphaerLandmark

    constructor(label: string, left: SphaerLandmark, right: SphaerLandmark) {
        this.label = label
        this.left = left
        this.right = right
    }

    // in the units of the calibration, undefined until both landmarks have a position
    get length(): number | undefined {
        if (this.left.position == undefined || this.right.position == undefined) {
            return undefined
        }
        return math.number(math.distance(this.left.position.slice(0, 3), this.right.position.slice(0, 3)) as number)
    }

    in(landmark: SphaerLandmark | string): boolean {
        return this.left.equals(landmark) || this.right.equals(landmark)
    }

    equals(other: SphaerDistance) {
        return (this.left.equals(other.left) && this.right.equals(other.right))
            || (this.left.equals(other.right) && this.right.equals(other.left))
    }

    toJSON(): DistanceJSON {
        return { label: this.label, left: this.left.id, right: this.right.id }
    }
}

// Sidebar state kept across reloads: the landmarks selected for the next distance
export type SphaerSelection = {
    selection: string[]
}

// The annotations of the sphere, kept by its acquisition like the core Annotations
export class SphaerAnnotations implements AnnotationsSet {
    landmarks: SphaerLandmark[] = []
    distances: SphaerDistance[] = []
    // the two landmarks of the next distance
    selection: DequeMax2<SphaerLandmark> = new DequeMax2<SphaerLandmark>()
    adjustFactor: number = 1
    scale: ScaleUnit = "m"

    generateID(): string {
        let id: string
        do {
            id = randomID()
        } while (this.landmarks.some((landmark) => landmark.id == id))
        return id
    }

    getLandmark(id: string): SphaerLandmark | undefined {
        return this.landmarks.find((landmark) => landmark.id == id)
    }

    // a distance is made once between two landmarks
    addDistance(left: SphaerLandmark, right: SphaerLandmark, label: string | null = null) {
        const distance = new SphaerDistance(label || left.label + " -> " + right.label, left, right)
        if (!left.equals(right) && !this.distances.some((other) => other.equals(distance))) {
            this.distances.push(distance)
        }
    }

    // distance between the two selected landmarks
    addSelectedDistance() {
        const [left, right] = this.selection.items
        if (left && right) {
            this.addDistance(left, right)
        }
    }

    toggleSelection(id: string) {
        const landmark = this.getLandmark(id)
        if (landmark == undefined) {
            return
        }
        if (this.selection.contains(landmark)) {
            this.selection.remove(landmark)
        } else {
            this.selection.add(landmark)
        }
    }

    // the distances of a removed landmark go with it
    removeLandmark(id: string) {
        this.distances = this.distances.filter((distance) => !distance.in(id))
        this.landmarks = this.landmarks.filter((landmark) => !landmark.equals(id))
        this.selection.remove(id)
    }

    removeDistance(index: number) {
        this.distances.splice(index, 1)
    }

    // length in the units of the calibration -> shown in the current scale
    scaled(length: number | undefined): number {
        return length == undefined ? 0 : math.round(length * this.adjustFactor / Scale[this.scale], ROUNDING)
    }

    // typing a known length on a distance calibrates the positions
    calibrate(distance: SphaerDistance, target: number) {
        const length = distance.length
        if (length && target > 0) {
            this.adjustFactor = target / length * Scale[this.scale]
        }
    }

    resetScale() {
        this.adjustFactor = 1
    }

    toJSON(): AnnotationsJSON {
        return {
            scaleFactor: this.adjustFactor,
            scale: { unit: this.scale, factor: Scale[this.scale] },
            landmarks: Object.fromEntries(this.landmarks.map((landmark) => [landmark.id, landmark.toJSON()])),
            distances: this.distances.map((distance) => distance.toJSON()),
        }
    }

    // Adds saved annotations to these ones (import): the landmarks get new ids,
    // so a file imported twice gives two sets of landmarks.
    // A section that is missing, null or of another type is empty, an item that can't be read is skipped
    // (a distance whose landmarks aren't there too) and unknown sections are ignored (see readList in optica-core)
    merge(object: Partial<AnnotationsJSON>, keepIDs: boolean = false) {
        if (!isRecord(object)) {
            return
        }
        const ids = new Map<string, SphaerLandmark>()
        Object.entries(readRecord(object.landmarks, "landmarks")).forEach(([id, landmarkObject]) => {
            const landmark = readItem(landmarkObject, (item) => SphaerLandmark.fromJSON(keepIDs ? id : this.generateID(), item), "landmark")
            if (landmark) {
                ids.set(id, landmark)
                this.landmarks.push(landmark)
            }
        })
        readList(object.distances, (distance) => distance, "distance").forEach((distance) => {
            const left = ids.get(distance.left)
            const right = ids.get(distance.right)
            if (left && right) {
                this.addDistance(left, right, readLabel(distance.label))
            }
        })
        if (typeof object.scaleFactor === "number") {
            this.adjustFactor = object.scaleFactor
        }
        if (isScaleUnit(object.scale?.unit)) {
            this.scale = object.scale.unit
        }
    }

    // Replaces these annotations by saved ones (persistence)
    restore(object: Partial<AnnotationsJSON>) {
        this.landmarks = []
        this.distances = []
        this.selection = new DequeMax2<SphaerLandmark>()
        this.merge(object, true)
    }

    getSelection(): SphaerSelection {
        return { selection: this.selection.items.map((landmark) => landmark.id) }
    }

    setSelection(selection: Partial<SphaerSelection>) {
        this.selection = new DequeMax2<SphaerLandmark>()
        ;(selection.selection ?? []).forEach((id) => {
            const landmark = this.getLandmark(id)
            if (landmark) {
                this.selection.add(landmark)
            }
        })
    }

    // the adjusted position is in the current scale
    csvHeader(): string[] {
        const unit = this.scale
        return ["Label", "Color", "X", "Y", "Z", `X_${unit}`, `Y_${unit}`, `Z_${unit}`]
    }

    // one row per triangulated landmark (no header)
    toCSVRows(): string[][] {
        return [
            ...this.landmarks.filter((landmark) => landmark.position != undefined).map((landmark) => {
                const position = landmark.position!.slice(0, 3)
                return [landmark.label, landmark.getColorHEX(), ...position.map(String), ...position.map((value) => String(this.scaled(value)))]
            }),
        ]
    }
}
