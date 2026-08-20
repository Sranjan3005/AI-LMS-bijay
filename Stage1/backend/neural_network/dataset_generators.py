"""
neural_network/dataset_generators.py

Generates pixel-intensity CSVs for Neural Network scenarios.
Because we run in a 45-second sandbox without GPU, we use 8x8 pixel images (64 features).
Rows are flattened 8x8 images + label.
"""

import io
import numpy as np
import pandas as pd
from sklearn.datasets import load_digits


def _to_csv_bytes(df: pd.DataFrame) -> bytes:
    buf = io.BytesIO()
    df.to_csv(buf, index=False)
    return buf.getvalue()


# ═══════════════════════════════════════════════════════════════════════════
# 15. THE SELF-DRIVING EYE (Digit Recognition)
# We use sklearn's built-in digits dataset (8x8 pixel numbers) to keep it fast.
# ═══════════════════════════════════════════════════════════════════════════

def _get_base_digits(n_samples=200):
    digits = load_digits()
    X = digits.data[:n_samples]  # Get first 200 to keep sandbox training fast (<10s)
    y = digits.target[:n_samples]
    # Create columns: pixel_0_0, pixel_0_1 ... pixel_7_7
    cols = [f'pixel_{i//8}_{i%8}' for i in range(64)]
    df = pd.DataFrame(X, columns=cols)
    df['label'] = y
    return df

def self_driving_eye_high_quality() -> bytes:
    """Perfectly clear, bright images. The default digits dataset."""
    df = _get_base_digits(300)
    return _to_csv_bytes(df)

def self_driving_eye_low_resolution() -> bytes:
    """Highly compressed images. We add heavy random noise to the pixels."""
    rng = np.random.default_rng(seed=1501)
    df = _get_base_digits(300)
    feature_cols = [c for c in df.columns if c != 'label']
    
    # Add noise to simulate compression/blur
    noise = rng.uniform(0, 8, size=(len(df), 64))
    df[feature_cols] = np.clip(df[feature_cols] + noise, 0, 16).round(0)
    return _to_csv_bytes(df)

def self_driving_eye_rotated_signs() -> bytes:
    """Numbers that are upside down or rotated."""
    df = _get_base_digits(300)
    feature_cols = [c for c in df.columns if c != 'label']
    
    # To rotate an 8x8 image 180 degrees, we just reverse the 64 pixels per row
    df[feature_cols] = df[feature_cols].values[:, ::-1]
    return _to_csv_bytes(df)


# ═══════════════════════════════════════════════════════════════════════════
# 16. THE EMOTION READER (Face classification)
# Since we don't have a fast 8x8 face dataset built-in, we generate synthetic
# 8x8 heatmaps that represent different simple emotion patterns.
# Label 0: Happy (U shape), Label 1: Sad (Inverted U), Label 2: Surprised (O shape)
# ═══════════════════════════════════════════════════════════════════════════

def _generate_synthetic_faces(n_samples, noise_level=2.0, seed=1600):
    rng = np.random.default_rng(seed=seed)
    X = []
    y = []
    
    # Base 8x8 templates for emotions (eyes at row 2, mouth at row 5/6)
    for _ in range(n_samples):
        img = np.zeros((8, 8))
        img[2, 2] = 12; img[2, 5] = 12  # eyes
        
        emotion = rng.integers(0, 3)
        if emotion == 0:   # Happy (U shape smile)
            img[5, 2] = 10; img[6, 3:5] = 15; img[5, 5] = 10
        elif emotion == 1: # Sad (Inverted U frown)
            img[6, 2] = 10; img[5, 3:5] = 15; img[6, 5] = 10
        else:              # Surprised (O shape mouth)
            img[5:7, 3:5] = 12
            
        # Add noise
        img += rng.uniform(0, noise_level, (8, 8))
        X.append(np.clip(img.flatten(), 0, 16))
        y.append(emotion)
        
    cols = [f'pixel_{i//8}_{i%8}' for i in range(64)]
    df = pd.DataFrame(X, columns=cols).round(0)
    df['label'] = y
    return df

def emotion_reader_diverse_faces() -> bytes:
    """Different lighting/angles (represented by moderate noise)."""
    df = _generate_synthetic_faces(250, noise_level=3.0, seed=1601)
    return _to_csv_bytes(df)

def emotion_reader_the_sunglasses_set() -> bytes:
    """Faces covered by sunglasses. The eye pixels are blocked out to 0."""
    df = _generate_synthetic_faces(250, noise_level=2.0, seed=1602)
    feature_cols = [c for c in df.columns if c != 'label']
    
    # Zero out rows 2 and 3 (the eye area) to simulate thick sunglasses
    for i in range(64):
        if i // 8 in [2, 3]: 
            df[f'pixel_{i//8}_{i%8}'] = 0
            
    return _to_csv_bytes(df)

def emotion_reader_the_same_person_set() -> bytes:
    """Overfitting trap: Zero noise, exact same base face every time."""
    df = _generate_synthetic_faces(250, noise_level=0.0, seed=1603)
    return _to_csv_bytes(df)


# ═══════════════════════════════════════════════════════════════════════════
# REGISTRY
# ═══════════════════════════════════════════════════════════════════════════

GENERATORS = {
    ('the_self-driving_eye', 'high-quality'):     self_driving_eye_high_quality,
    ('the_self-driving_eye', 'low-resolution'):   self_driving_eye_low_resolution,
    ('the_self-driving_eye', 'rotated_signs'):    self_driving_eye_rotated_signs,
    
    ('the_emotion_reader',   'diverse_faces'):    emotion_reader_diverse_faces,
    ('the_emotion_reader',   'the_sunglasses_set'): emotion_reader_the_sunglasses_set,
    ('the_emotion_reader',   'the_"same_person"_set'): emotion_reader_the_same_person_set,
}

def _title_to_slug(title: str) -> str:
    return title.lower().replace(' ', '_').strip()

def get_dataset(scenario_title: str, variant_name: str) -> bytes:
    from scenarios.models import DataVariant
    try:
        variant = DataVariant.objects.get(scenario__title=scenario_title, name=variant_name)
        if variant.data_payload:
            return variant.data_payload.encode('utf-8')
    except DataVariant.DoesNotExist:
        pass

    slug = _title_to_slug(scenario_title)
    key  = (slug, variant_name)
    if key not in GENERATORS:
        raise KeyError(f'No NN generator for {key}')
    return GENERATORS[key]()

