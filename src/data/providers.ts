import axios, { type AxiosResponse } from "axios"
import { OrthancProvider, segment, WebProvider, type Coordinates, type DataProvider } from "optica-core"

// The sphaer routes, on top of the common ones. Each provider knows how its backend lays them out,
// the ids are encoded (imageUrl does it, url(route) does not) so they can't point to another route.
export interface SphaerProvider extends DataProvider {
    // 3D position (homogeneous) from the poses of a landmark, by image name
    triangulate(objectPath: string, poses: Map<string, Coordinates>): Promise<AxiosResponse>
    // pixel of an image where a 3D position is seen
    reproject(objectPath: string, imageName: string, position: number[]): Promise<AxiosResponse>
    // named views of the object (FRONT, LEFT, SUPERIOR...)
    getShortcuts(objectPath: string): Promise<AxiosResponse>
}

function reprojectParams(position: number[]) {
    const [x, y, z, w = 1] = position
    return { x, y, z, w }
}

// Sphaeroptica backend (app.py): /<id>/triangulate, /<id>/<image>/reproject, /<id>/shortcuts
export class SphaerWebProvider extends WebProvider implements SphaerProvider {
    triangulate(objectPath: string, poses: Map<string, Coordinates>): Promise<AxiosResponse> {
        return axios.post(this.url(`${segment(objectPath)}/triangulate`), { poses: Object.fromEntries(poses) })
    }

    reproject(objectPath: string, imageName: string, position: number[]): Promise<AxiosResponse> {
        return axios.get(this.imageUrl(objectPath, imageName, "reproject"), { params: reprojectParams(position) })
    }

    getShortcuts(objectPath: string): Promise<AxiosResponse> {
        return axios.get(this.url(`${segment(objectPath)}/shortcuts`))
    }
}

// Orthanc plugin: the images are found by their instance id, without the object
export class SphaerOrthancProvider extends OrthancProvider implements SphaerProvider {
    constructor(server: string) {
        super(server, "sphaeroptica")
    }

    triangulate(_objectPath: string, poses: Map<string, Coordinates>): Promise<AxiosResponse> {
        return axios.post(this.url("triangulate"), { poses: Object.fromEntries(poses) })
    }

    reproject(objectPath: string, imageName: string, position: number[]): Promise<AxiosResponse> {
        return axios.get(this.imageUrl(objectPath, imageName, "reproject"), { params: reprojectParams(position) })
    }

    getShortcuts(objectPath: string): Promise<AxiosResponse> {
        return axios.get(this.url(`${segment(objectPath)}/shortcuts`))
    }
}
