import {
    Acquisition, ProjectRepository, degreesToRad,
    type AcquisitionObject, type Coordinates, type ProjectImage,
} from "optica-core"
import { SphaerAnnotations } from "./annotations"
import type { SphaerProvider } from "./providers"

const LONG_MIN = 0
const LONG_MAX = 360

// Where a view is on the sphere around the object, in degrees
export type SphereCoordinates = {
    longitude: number
    latitude: number
}

export type SphereImage = ProjectImage & { coordinates: SphereCoordinates }

// angle between two points of the sphere (haversine)
function angularDistance(first: SphereCoordinates, second: SphereCoordinates): number {
    const lat1 = degreesToRad(first.latitude)
    const lat2 = degreesToRad(second.latitude)
    const dLat = lat2 - lat1
    const dLong = degreesToRad(second.longitude - first.longitude)
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLong / 2) ** 2
    return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// The views of the sphere: the shown image is the one nearest to the virtual camera.
// Its annotations are the sphaer ones: landmarks posed on several views.
export class SphaerAcquisition extends Acquisition<SphereImage, SphaerAnnotations> {
    // virtual camera
    coordinates: SphereCoordinates
    // the camera can't go above or below the views
    latMin: number
    latMax: number

    constructor(object: AcquisitionObject<SphereImage>) {
        super(object)
        const latitudes = object.images.map((image) => image.coordinates.latitude)
        this.latMin = latitudes.length ? Math.min(...latitudes) : 0
        this.latMax = latitudes.length ? Math.max(...latitudes) : 0
        this.coordinates = { longitude: 0, latitude: 0 }
        this.setCoordinates(this.coordinates)
    }

    protected createAnnotations(): SphaerAnnotations {
        return new SphaerAnnotations()
    }

    nearestIndex(coordinates: SphereCoordinates): number {
        let nearest = 0
        let best = Number.MAX_VALUE
        this.images.forEach((image, index) => {
            const distance = angularDistance(coordinates, image.coordinates)
            if (distance < best) {
                best = distance
                nearest = index
            }
        })
        return nearest
    }

    // move the camera (shortcuts) and show the nearest view
    setCoordinates(coordinates: SphereCoordinates) {
        this.coordinates = { longitude: coordinates.longitude, latitude: coordinates.latitude }
        this.setIndex(this.nearestIndex(this.coordinates))
    }

    home() {
        this.setCoordinates({ longitude: 0, latitude: 0 })
    }

    moveLongitude(move: number) {
        const difference = LONG_MAX - LONG_MIN
        let longitude = this.coordinates.longitude - (LONG_MIN + move)
        while (longitude < LONG_MIN) {
            longitude += difference
        }
        this.setCoordinates({ longitude: (longitude % difference) + LONG_MIN, latitude: this.coordinates.latitude })
    }

    moveLatitude(move: number) {
        const latitude = Math.min(Math.max(this.coordinates.latitude + move, this.latMin), this.latMax)
        this.setCoordinates({ longitude: this.coordinates.longitude, latitude })
    }
}

// Standard payload, or the one of the first backends (and the Orthanc plugin):
// { images: [{ name, coordinates, hasThumbnail }], size }
export function parseSphere(data: any): AcquisitionObject<SphereImage>[] {
    if (data.acquisitions) {
        return data.acquisitions
    }
    return [{
        id: "sphere",
        images: (data.images as SphereImage[]).map((image) => ({ ...image, label: image.label ?? image.name })),
        size: data.size,
    }]
}

export class SphaerRepository extends ProjectRepository<SphereImage, SphaerAcquisition> {
    declare provider: SphaerProvider

    constructor(provider: SphaerProvider) {
        super(provider, parseSphere, (object) => new SphaerAcquisition(object))
    }

    async triangulate(objectPath: string, poses: Map<string, Coordinates>): Promise<number[]> {
        return (await this.provider.triangulate(objectPath, poses)).data as number[]
    }

    async reproject(objectPath: string, imageName: string, position: number[]): Promise<Coordinates> {
        return (await this.provider.reproject(objectPath, imageName, position)).data as Coordinates
    }

    async getShortcuts(objectPath: string): Promise<Record<string, SphereCoordinates>> {
        return (await this.provider.getShortcuts(objectPath)).data as Record<string, SphereCoordinates>
    }
}
