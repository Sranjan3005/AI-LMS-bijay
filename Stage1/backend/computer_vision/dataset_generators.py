"""
computer_vision/dataset_generators.py

Provides sample images for CV scenarios.
For 'Digit Detective': generates simple digit images using matplotlib.
For 'Edge Explorer': provides paths to bundled sample images.
For 'Handwriting Decoder': provides sample handwriting images.
"""

import io
import os
import numpy as np


# ── Stage descriptions for each scenario ─────────────────────────────────────

STAGE_METADATA = {
    'the_digit_detective': {
        'stages': [
            {'title': 'Capture', 'description': 'Your handwritten digit, captured as raw pixels from the canvas.'},
            {'title': 'Process', 'description': 'Converting to grayscale, centering the digit, and normalizing pixel values from 0-255 to 0-1.'},
            {'title': 'Understand', 'description': 'The model identifies which pixel patterns match known digit shapes — brighter regions show higher activation.'},
            {'title': 'Decide', 'description': 'The neural network outputs confidence scores for each digit (0-9). The highest bar is the prediction!'},
        ],
    },
    'the_handwriting_decoder': {
        'stages': [
            {'title': 'Capture', 'description': 'Your handwriting, captured as a digital image from the canvas.'},
            {'title': 'Process', 'description': 'Converting to pure black-and-white (binarization), removing noise and smoothing edges.'},
            {'title': 'Understand', 'description': 'Segmenting: the AI identifies individual character boundaries with bounding boxes.'},
            {'title': 'Decide', 'description': 'OCR output: the AI reads your handwriting and converts it to typed text.'},
        ],
    },
    'the_edge_explorer': {
        'stages': [
            {'title': 'Capture', 'description': 'The raw image — just pixels of red, green, and blue.'},
            {'title': 'Process', 'description': 'Converting 3 color channels (RGB) to 1 intensity channel (grayscale).'},
            {'title': 'Understand', 'description': 'Canny edge detection finds boundaries where pixel intensity changes sharply.'},
            {'title': 'Decide', 'description': 'Feature maps highlight the structures a CNN would learn — edges, textures, and shapes overlaid on the original.'},
        ],
    },
}


def _title_to_slug(title: str) -> str:
    """Convert scenario title to a slug key."""
    return title.lower().replace(' ', '_').replace("'", '').replace('"', '')


def generate_sample_digit_image(digit: int = 5) -> bytes:
    """Generate a simple digit image as PNG bytes using matplotlib."""
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt

    fig, ax = plt.subplots(1, 1, figsize=(1, 1), dpi=28)
    ax.set_facecolor('black')
    fig.patch.set_facecolor('black')
    ax.text(0.5, 0.5, str(digit), color='white', fontsize=20,
            ha='center', va='center', fontweight='bold',
            fontfamily='monospace')
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis('off')

    buf = io.BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', pad_inches=0,
                facecolor='black', edgecolor='none')
    plt.close(fig)
    buf.seek(0)
    return buf.read()


def generate_sample_gradient_image() -> bytes:
    """Generate a colorful sample image for the Edge Explorer."""
    from PIL import Image

    width, height = 128, 128
    img_array = np.zeros((height, width, 3), dtype=np.uint8)

    # Create a gradient pattern with geometric shapes
    for y in range(height):
        for x in range(width):
            img_array[y, x, 0] = int(255 * x / width)    # Red gradient
            img_array[y, x, 1] = int(255 * y / height)    # Green gradient
            img_array[y, x, 2] = 128                       # Blue constant

    # Add some circles for edge detection interest
    cy, cx = height // 2, width // 2
    for y in range(height):
        for x in range(width):
            dist = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
            if 25 < dist < 30 or 45 < dist < 50:
                img_array[y, x] = [255, 255, 255]

    img = Image.fromarray(img_array)
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    return buf.read()


def generate_sample_traffic_sign() -> bytes:
    """Generate a simple stop sign image."""
    from PIL import Image, ImageDraw
    img = Image.new('RGB', (128, 128), color='black')
    draw = ImageDraw.Draw(img)
    # Draw a red octagon
    draw.polygon([(40, 10), (88, 10), (118, 40), (118, 88), (88, 118), (40, 118), (10, 88), (10, 40)], fill='red')
    # Draw STOP text
    draw.text((45, 55), "STOP", fill="white")
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    return buf.read()


def generate_sample_smiley_face() -> bytes:
    """Generate a simple smiley face."""
    from PIL import Image, ImageDraw
    img = Image.new('RGB', (128, 128), color='black')
    draw = ImageDraw.Draw(img)
    # Face
    draw.ellipse((20, 20, 108, 108), fill='yellow')
    # Eyes
    draw.ellipse((40, 40, 50, 50), fill='black')
    draw.ellipse((78, 40, 88, 50), fill='black')
    # Smile
    draw.arc((40, 60, 88, 90), start=0, end=180, fill='black', width=4)
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    return buf.read()


def get_sample_image(scenario_title: str, variant_name: str) -> bytes:
    """
    Return sample image bytes for a CV scenario + variant.
    This reads from public/datasets/ if available, else falls back to generated images.
    """
    slug = _title_to_slug(scenario_title)

    # Base path for frontend datasets
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../frontend/public/datasets'))

    # Map slug to dataset folder
    folder = None
    if slug in ['the_digit_detective', 'the_handwriting_decoder']:
        folder = 'handwriting'
    elif slug == 'the_edge_explorer':
        folder = 'edge'
    elif slug in ['the_self_driving_eye', 'the_self-driving_eye']:
        folder = 'signs'
    elif 'wildlife' in slug:
        folder = 'wildlife'
    elif 'mushroom' in slug:
        folder = 'mushroom'
    elif 'trash' in slug:
        folder = 'trash'

    if folder:
        # Check for variant subfolder first
        variant_safe = variant_name.lower().replace(' ', '_')
        paths_to_try = [
            os.path.join(base_dir, folder, variant_safe, '01.jpg'),
            os.path.join(base_dir, folder, variant_safe, '01.png'),
            os.path.join(base_dir, folder, '01.jpg'),
            os.path.join(base_dir, folder, '01.png'),
        ]
        
        for p in paths_to_try:
            if os.path.exists(p):
                with open(p, 'rb') as f:
                    return f.read()

    # Fallbacks if real dataset files not found
    if slug == 'the_digit_detective':
        digit_map = {'clean': 5, 'messy': 3, 'noisy': 7}
        digit = digit_map.get(variant_name, 5)
        return generate_sample_digit_image(digit)
    elif slug == 'the_edge_explorer':
        return generate_sample_gradient_image()
    elif slug == 'the_handwriting_decoder':
        return generate_sample_digit_image(8)
    elif slug == 'the_self-driving_eye' or slug == 'the_self_driving_eye':
        return generate_sample_traffic_sign()
    elif slug == 'the_emotion_reader':
        return generate_sample_smiley_face()
    else:
        return generate_sample_digit_image(0)


def get_stage_metadata(scenario_title: str) -> list:
    """Return the 4 stage descriptions for a given scenario."""
    slug = _title_to_slug(scenario_title)
    meta = STAGE_METADATA.get(slug, STAGE_METADATA['the_digit_detective'])
    return meta['stages']
