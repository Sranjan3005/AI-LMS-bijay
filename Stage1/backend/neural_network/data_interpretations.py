"""
neural_network/data_interpretations.py
Static metadata for the /interpret/ endpoint
"""

INTERPRETATIONS = {
    'the_self-driving_eye': {
        'overview': {
            'target_column': 'label',
            'feature_columns': ['pixel_0_0', '...', 'pixel_7_7']
        },
        'columns': [
            {
                'name': 'pixel_X_Y',
                'type': 'numeric (0-16)',
                'description': 'The brightness of a single pixel in the 8x8 image. 0 is white, 16 is black.',
                'expected_range': '0 to 16'
            },
            {
                'name': 'label',
                'type': 'categorical',
                'description': 'The actual number (0-9) that the person wrote.',
                'expected_range': '0 to 9'
            }
        ],
        'preprocessing': [
            {
                'step': 1,
                'name': 'Flattening the Image',
                'description': 'The 8x8 pixel image is flattened into a single row of 64 numbers.',
                'student_analogy': 'Like unrolling a 2D rug into a long 1D line of threads so the AI can read it left-to-right.'
            }
        ],
        'variants': {
            'high-quality': {
                'bias_type': 'None',
                'severity': 'Low',
                'description': 'This is perfect, clean data. The AI will learn very easily.',
                'what_would_fix_it': 'Nothing! It is already perfect.'
            },
            'low-resolution': {
                'bias_type': 'Noise Contamination',
                'severity': 'High',
                'description': 'Random noise has been added to every pixel, blurring the image.',
                'what_would_fix_it': 'Applying a smoothing filter or gathering higher quality photos.'
            },
            'rotated_signs': {
                'bias_type': 'Distribution Shift',
                'severity': 'Extreme',
                'description': 'The images are upside down. The AI will fail if it was trained on right-side-up numbers.',
                'what_would_fix_it': 'Data augmentation: deliberately rotate images during training so the AI learns all angles.'
            }
        }
    },
    'the_emotion_reader': {
        'overview': {
            'target_column': 'label',
            'feature_columns': ['pixel_0_0', '...', 'pixel_7_7']
        },
        'columns': [
            {
                'name': 'pixel_X_Y',
                'type': 'numeric (0-16)',
                'description': 'The brightness of a single pixel representing a face.',
                'expected_range': '0 to 16'
            },
            {
                'name': 'label',
                'type': 'categorical',
                'description': '0=Happy, 1=Sad, 2=Surprised',
                'expected_range': '0 to 2'
            }
        ],
        'preprocessing': [
            {
                'step': 1,
                'name': 'Pixel Extraction',
                'description': 'The AI looks at the contrast between pixels to find facial features like eyes and mouths.',
                'student_analogy': 'Like looking for shadows on the moon to see the "Man in the Moon".'
            }
        ],
        'variants': {
            'diverse_faces': {
                'bias_type': 'None',
                'severity': 'Low',
                'description': 'Good variety of features and slight noise representing different lighting.',
                'what_would_fix_it': 'N/A'
            },
            'the_sunglasses_set': {
                'bias_type': 'Missing Features',
                'severity': 'Medium',
                'description': 'The eye pixels are blocked out (set to 0). The AI must learn to guess emotion using ONLY the mouth.',
                'what_would_fix_it': 'Use infrared cameras or ask people to remove glasses.'
            },
            'the_"same_person"_set': {
                'bias_type': 'Overfitting Trap',
                'severity': 'Extreme',
                'description': 'Every face is perfectly identical. The AI will memorize the face instead of learning the emotion concept.',
                'what_would_fix_it': 'Collect data from thousands of different people.'
            }
        }
    }
}
