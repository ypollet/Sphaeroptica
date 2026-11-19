# Sphaeroptica manifest: `calibration.json`

The fields sphaeroptica adds to the common manifest ([core/MANIFEST.md](../core/MANIFEST.md)). The JSON Schema is [`manifest.schema.json`](manifest.schema.json).

There is one acquisition, the views around the object. `unit` is `m`, and `pixelSize` is `null` because positions come from the calibration.

```jsonc
{
  "id": "sphere", "size": { "width": 5472, "height": 3648 }, "pixelSize": null,
  "calibration": {
    "cameraMatrix": [[fx, 0, cx], [0, fy, cy], [0, 0, 1]],   // pixels
    "distortion": [k1, k2, p1, p2, k3]                       // OpenCV
  },
  "images": [{ "file": "_x_00000_y_00000_.jpg", "extrinsics": [[r11, r12, r13, tx], [...], [...]] }],  // [R|t] world -> camera
  "shortcuts": { "FRONT": { "longitude": 0, "latitude": 0 } }   // optional, in angleUnit
}
```

Check a manifest (the tests in `tests/test_manifest.py` check every manifest of `data/`):

```bash
python -m optica_core.schema manifest.schema.json data/<object>/calibration.json
```
