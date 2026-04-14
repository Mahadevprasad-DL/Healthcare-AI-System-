import base64
import io
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
from PIL import Image, ImageOps
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

ROOT_DIR = Path(__file__).resolve().parent
PROJECT_DIR = ROOT_DIR.parent.parent
DATASET_DIR = PROJECT_DIR / 'supabase' / 'dataset'
ARTIFACT_DIR = ROOT_DIR / 'artifacts'
MODEL_PATH = ARTIFACT_DIR / 'disease_image_model.joblib'

RECOMMENDATIONS = {
    'Common Cold': 'Rest, hydrate well, and monitor symptoms. Seek care if fever or breathing issues develop.',
    'Influenza': 'Rest, hydration, and medical review are recommended, especially if fever or weakness increases.',
    'Allergy': 'Avoid known triggers and consider medical evaluation if symptoms are persistent or severe.',
    'Migraine': 'Rest in a quiet environment and consult a clinician if headaches are recurrent or severe.',
    'Typhoid': 'Medical evaluation is recommended for confirmatory testing and treatment planning.',
    'Dengue': 'Seek prompt medical attention for testing and hydration support if dengue is suspected.',
    'Malaria': 'Prompt diagnostic testing and treatment are recommended if malaria is suspected.',
    'Stomach Infection': 'Maintain hydration and seek clinical review if vomiting, pain, or dehydration worsens.',
    'Skin Infection': 'Keep the area clean and seek medical care if redness, swelling, or fever increases.',
    'Pneumonia': 'Please consult a healthcare professional urgently for respiratory assessment and treatment.',
    'COVID-19': 'Consider testing, isolation if needed, and clinical review based on local guidelines.',
    'Asthma': 'Use prescribed treatment as directed and seek immediate care for breathing difficulty.',
}

DEFAULT_RECOMMENDATION = 'Please consult a qualified healthcare professional for confirmation and treatment.'
IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.bmp'}

try:
    RESAMPLE_MODE = Image.Resampling.BILINEAR
except AttributeError:
    RESAMPLE_MODE = Image.BILINEAR


def natural_key(name: str):
    return [int(part) if part.isdigit() else part.lower() for part in re.split(r'(\d+)', name)]


def list_image_paths(folder: Path):
    return sorted(
        [path for path in folder.iterdir() if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS],
        key=lambda item: natural_key(item.name),
    )


def collect_samples():
    if not DATASET_DIR.exists():
        raise FileNotFoundError(f'Dataset folder not found: {DATASET_DIR}')

    subdirectories = sorted([path for path in DATASET_DIR.iterdir() if path.is_dir()], key=lambda item: item.name.lower())
    if not subdirectories:
        raise ValueError(
            'Dataset must be labeled using subfolders per disease under supabase/dataset. '
            'Example: supabase/dataset/asthma/*.jpg, supabase/dataset/dengue/*.jpg'
        )

    samples = []
    for subdirectory in subdirectories:
        label = subdirectory.name.replace('_', ' ').replace('-', ' ').title()
        image_paths = list_image_paths(subdirectory)
        for image_path in image_paths:
            samples.append((image_path, label))

    if not samples:
        raise FileNotFoundError(f'No labeled images were found in subfolders of: {DATASET_DIR}')

    return samples


def decode_image_source(image_source):
    if not isinstance(image_source, str) or not image_source.strip():
        raise ValueError('Invalid image payload received.')

    if image_source.startswith('data:') and ',' in image_source:
        image_source = image_source.split(',', 1)[1]

    decoded_bytes = base64.b64decode(image_source)
    return Image.open(io.BytesIO(decoded_bytes))


def extract_features(image_source):
    if isinstance(image_source, (str, os.PathLike, Path)) and Path(image_source).exists():
        image = Image.open(image_source)
    else:
        image = decode_image_source(str(image_source))

    image = ImageOps.exif_transpose(image).convert('L').resize((64, 64), RESAMPLE_MODE)
    array = np.asarray(image, dtype=np.float32) / 255.0
    histogram = np.histogram(array, bins=16, range=(0.0, 1.0), density=True)[0].astype(np.float32)
    stats = np.array([array.mean(), array.std(), array.min(), array.max()], dtype=np.float32)
    return np.concatenate([array.flatten(), histogram, stats])


def train_model(force_retrain=False):
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    if MODEL_PATH.exists() and not force_retrain:
        return joblib.load(MODEL_PATH)

    samples = collect_samples()
    features = np.vstack([extract_features(image_path) for image_path, _ in samples])
    labels = np.array([label for _, label in samples])

    if len(np.unique(labels)) < 2:
        raise ValueError('The dataset needs at least two classes to train a classifier.')

    neighbors = min(5, len(samples))
    model = Pipeline(
        steps=[
            ('scaler', StandardScaler()),
            ('knn', KNeighborsClassifier(n_neighbors=neighbors, weights='distance')),
        ]
    )
    model.fit(features, labels)

    class_names = model.named_steps['knn'].classes_.tolist()
    bundle = {
        'model': model,
        'class_names': class_names,
        'trained_at': datetime.now(timezone.utc).isoformat(),
        'sample_count': len(samples),
        'image_size': [64, 64],
        'labeled_dataset': True,
    }
    joblib.dump(bundle, MODEL_PATH)
    return bundle


def ensure_model():
    if MODEL_PATH.exists():
        bundle = joblib.load(MODEL_PATH)
        if bundle.get('labeled_dataset'):
            return bundle

        # Force retrain if an old artifact was built with unsupported unlabeled logic.
        return train_model(force_retrain=True)

    return train_model(force_retrain=False)


def predict_images(image_payloads):
    bundle = ensure_model()
    model = bundle['model']
    class_names = bundle['class_names']

    if not isinstance(image_payloads, list) or not image_payloads:
        raise ValueError('At least one image is required for prediction.')

    features = np.vstack([extract_features(payload) for payload in image_payloads])
    probabilities = model.predict_proba(features)
    combined_probabilities = probabilities.mean(axis=0)

    best_index = int(np.argmax(combined_probabilities))
    disease_name = class_names[best_index]
    confidence_score = round(float(combined_probabilities[best_index] * 100.0), 2)
    top_indices = np.argsort(combined_probabilities)[::-1][:3]

    top_predictions = [
        {
            'disease_name': class_names[int(index)],
            'confidence_score': round(float(combined_probabilities[int(index)] * 100.0), 2),
        }
        for index in top_indices
    ]

    return {
        'disease_name': disease_name,
        'confidence_score': confidence_score,
        'recommended_action': RECOMMENDATIONS.get(disease_name, DEFAULT_RECOMMENDATION),
        'created_at': datetime.now(timezone.utc).isoformat(),
        'top_predictions': top_predictions,
        'sample_count': bundle.get('sample_count', 0),
    }


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else 'predict'

    try:
        if mode == 'train':
            bundle = train_model(force_retrain=True)
            result = {
                'success': True,
                'sample_count': bundle.get('sample_count', 0),
                'class_names': bundle.get('class_names', []),
                'trained_at': bundle.get('trained_at'),
            }
        elif mode == 'predict':
            payload = json.loads(sys.stdin.read() or '{}')
            result = {
                'prediction': predict_images(payload.get('images', [])),
            }
        else:
            raise ValueError('Unsupported mode requested.')

        json.dump(result, sys.stdout)
    except Exception as error:  # noqa: BLE001
        json.dump({'error': str(error)}, sys.stdout)
        sys.exit(1)


if __name__ == '__main__':
    main()
