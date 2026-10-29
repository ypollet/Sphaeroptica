# Sphaeroptica (core)

Sphaeroptica rebuilt on [`core/`](../core): the viewer, thumbnail, landmark list, menu, project model and data layer come from `optica-core` and `optica_core`; this folder only keeps what is specific to calibrated views on a sphere.

- `app.py`: the `calibration.json` adapter of the common API. One acquisition `sphere`: every view with its `coordinates` (longitude, latitude on the sphere fitted through the camera centers). App routes: `POST /<id>/triangulate` (`{poses: {image: {x, y}}}` → `[x, y, z, 1]`), `GET /<id>/<image>/reproject?x&y&z&w`, `GET /<id>/shortcuts`.
- `photogrammetry/`: triangulation, (un)distortion and sphere fit, copied from the old Sphaeroptica.
- `src/data/sphere.ts`: `SphaerAcquisition` (virtual camera, nearest view, holds the `SphaerAnnotations`) and `SphaerRepository` (also reads the old `/images` payload of the Orthanc plugin).
- `src/data/annotations.ts`: the sphaer landmarks and distances (a core `AnnotationsSet`: saved across reloads by the core `usePersistedAnnotations`), which differ from the core ones:
  - a landmark has one pose per view; its 3D position is triangulated once it is posed on **two views**, and reprojected (white outline) on the others;
  - a distance links **two landmarks** and measures their 3D positions; typing a length calibrates the scale.
- `src/lib/stores.ts`: the project, the reprojection cache, triangulation.
- `src/components/`: viewer (context menu), sidebar (camera, shortcuts, landmarks, distances), menu.

Usage: right click on the view to add a landmark, pose an existing one or delete its pose on this view; drag a landmark (or its reprojection) to pose it there. Double click two landmarks in the list, then right click it → *Create Distance*. Drag the thumbnail to turn around the object.

Exports keep the old JSON format (`landmarks` by id with `poses` and `position`, `distances` as `{label, left, right}`) with `scale_factor`/`scale`; old files (`scaleFactor`) are still imported. Lengths use the sphaer scale (`m = 1`, as in the old Sphaeroptica), not the core one (`mm = 1`).

## Run

```bash
# backend, objects in ./data/<id>/calibration.json ($OPTICA_DATA_FOLDER to use another folder)
python -m venv .venv && .venv/bin/pip install -r requirements.txt
OPTICA_DATA_FOLDER=../sphaer-old/data .venv/bin/flask --app app run --port 5000

# frontend (http://localhost:5173/?series=<id>)
npm install
npm run dev
```

`.env` selects the backend (`VITE_BACKEND_TYPE=WEB|ORTHANC`, `VITE_BACKEND_URL`).
