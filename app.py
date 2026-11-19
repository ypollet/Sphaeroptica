import numpy as np
from flask import abort, jsonify, request
from flask_cors import cross_origin
from optica_core import Dataset, acquisition, create_app, image, project

from photogrammetry import converters, helpers, reconstruction


class SphaerDataset(Dataset):
    """Calibrated views around an object, on a sphere (calibration.json, in meters)."""

    manifest = "calibration.json"
    viewer = "sphaeroptica"

    # the only acquisition: the views of the sphere
    @staticmethod
    def sphere(manifest):
        return manifest["acquisitions"][0]

    def images(self, id):
        manifest = self.load(id)
        sphere = self.sphere(manifest)
        # camera centers, to place each view on the sphere fitted through them
        centers = {}
        for entry in sphere["images"]:
            mat = np.matrix(entry["extrinsics"])
            centers[entry["file"]] = converters.get_camera_world_coordinates(mat[0:3, 0:3], mat[0:3, 3]).reshape(3, 1)
        _, center = reconstruction.sphereFit(
            [c.item(0) for c in centers.values()],
            [c.item(1) for c in centers.values()],
            [c.item(2) for c in centers.values()],
        )
        # found once: calibration.json is large, it is not read again for each view
        folder = self.thumbnails_folder(id, manifest)
        images = []
        for name, C in centers.items():
            longitude, latitude = converters.get_long_lat(C - center)
            images.append(image(
                name,
                coordinates={
                    "longitude": converters.rad2degrees(longitude),
                    "latitude": converters.rad2degrees(latitude),
                },
                hasThumbnail=self.has_thumbnail(folder, name),
            ))
        return project(acquisition(sphere["id"], label=sphere.get("label"), size=sphere["size"], images=images),
                       unit=manifest["unit"])

    def intrinsics(self, manifest):
        calibration = self.sphere(manifest)["calibration"]
        return np.matrix(calibration["cameraMatrix"]), np.matrix(calibration["distortion"])

    def extrinsics(self, manifest, image_id):
        _, entry = self.find_image(manifest, image_id)
        return np.matrix(entry["extrinsics"])

    # 3D position (homogeneous [x, y, z, 1]) of a landmark from its poses on at least two images
    def triangulate(self, id, poses):
        manifest = self.load(id)
        intrinsics, dist_coeffs = self.intrinsics(manifest)
        proj_points = []
        for image_id, pose in poses.items():
            proj_mat = reconstruction.projection_matrix(intrinsics, self.extrinsics(manifest, image_id))
            undistorted_pos = reconstruction.undistort_iter(
                np.array([[pose["x"], pose["y"]]]).reshape((1, 1, 2)), intrinsics, dist_coeffs
            )
            proj_points.append(helpers.ProjPoint(proj_mat, undistorted_pos))
        return reconstruction.triangulate_point(proj_points).tolist()

    # pixel of an image where a 3D position is seen
    def reproject(self, id, image_id, position):
        manifest = self.load(id)
        intrinsics, dist_coeffs = self.intrinsics(manifest)
        pose = reconstruction.project_points(position, intrinsics, self.extrinsics(manifest, image_id), dist_coeffs)
        return {"x": pose.item(0), "y": pose.item(1)}

    # named views (FRONT, LEFT, SUPERIOR...) -> {longitude, latitude} in degrees
    def shortcuts(self, id):
        manifest = self.load(id)
        return {name: {key: self.degrees(manifest, value) for key, value in view.items()}
                for name, view in self.sphere(manifest).get("shortcuts", {}).items()}


app = create_app(SphaerDataset, logo="Sphaeroptica", version="3.0.0")
dataset: SphaerDataset = app.extensions["optica_dataset"]


@app.route("/<id>/triangulate", methods=["POST"])
@cross_origin()
def triangulate(id):
    poses = (request.get_json(silent=True) or {}).get("poses")
    if not isinstance(poses, dict) or len(poses) < 2:
        abort(400)
    return jsonify(dataset.triangulate(id, poses))


# same query as the Orthanc plugin: /<image>/reproject?x&y&z&w
@app.route("/<id>/<image_id>/reproject")
@cross_origin()
def reproject(id, image_id):
    try:
        position = np.array([float(request.args[key]) for key in ("x", "y", "z")] + [float(request.args.get("w", 1))])
    except (KeyError, ValueError):
        abort(400)
    return jsonify(dataset.reproject(id, image_id, position))


@app.route("/<id>/shortcuts")
@cross_origin()
def shortcuts(id):
    return jsonify(dataset.shortcuts(id))


if __name__ == "__main__":
    app.run()
