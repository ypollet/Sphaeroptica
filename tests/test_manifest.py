"""The manifest schema of sphaeroptica (calibration.json), on top of the common one of optica_core."""

import copy
import glob
import json
import os

import pytest

pytest.importorskip("jsonschema")
from optica_core.schema import errors, validator  # noqa: E402

HERE = os.path.dirname(__file__)
SCHEMA = os.path.join(HERE, "..", "manifest.schema.json")
DATA = os.path.join(HERE, "..", "data")

EXAMPLE = {
    "format": "optica-manifest",
    "version": 1,
    "viewer": "sphaeroptica",
    "unit": "m",
    "angleUnit": "deg",
    "acquisitions": [
        {
            "id": "sphere",
            "size": {
                "width": 50,
                "height": 30
            },
            "pixelSize": None,
            "calibration": {
                "cameraMatrix": [
                    [
                        100,
                        0,
                        25
                    ],
                    [
                        0,
                        100,
                        15
                    ],
                    [
                        0,
                        0,
                        1
                    ]
                ],
                "distortion": [
                    0.1,
                    0.2,
                    0.3,
                    0.4,
                    0.5
                ]
            },
            "images": [
                {
                    "file": "v1.jpg",
                    "extrinsics": [
                        [
                            1,
                            0,
                            0,
                            0
                        ],
                        [
                            0,
                            1,
                            0,
                            0
                        ],
                        [
                            0,
                            0,
                            1,
                            0.2
                        ]
                    ]
                }
            ],
            "shortcuts": {
                "FRONT": {
                    "longitude": 0,
                    "latitude": 0
                }
            }
        }
    ]
}


@pytest.fixture(scope="module")
def check():
    return validator(SCHEMA)


def test_example(check):
    assert errors(check, EXAMPLE) == []


def in_mm(manifest):
    manifest["unit"] = "mm"


def the_old_commands(manifest):
    manifest["commands"] = {}


@pytest.mark.parametrize("mistake", [
    in_mm,
    the_old_commands,
])
def test_mistakes_are_refused(check, mistake):
    manifest = copy.deepcopy(EXAMPLE)
    mistake(manifest)
    assert errors(check, manifest) != []


# the manifests of the data folder, when there is one (it isn't in git)
@pytest.mark.parametrize("path", sorted(glob.glob(os.path.join(DATA, "**", "calibration.json"), recursive=True)) or [None])
def test_data(check, path):
    if path is None:
        pytest.skip("no calibration.json in data/")
    with open(path) as f:
        assert errors(check, json.load(f)) == []
