"""
management/commands/seed_scenarios.py

Seeds all 16 CBSE AI Lab scenarios into the database.
Safe to run multiple times — uses get_or_create so it won't duplicate data.

Usage:
    python manage.py seed_scenarios
"""

from django.core.management.base import BaseCommand
from scenarios.models import Scenario, DataVariant


SCENARIOS_DATA = [

    # ═══════════════════════════════════════════════════════
    # PART 1 — LINEAR REGRESSION (7 scenarios)
    # ═══════════════════════════════════════════════════════
    {
        'title':      'The Smart Greenhouse',
        'model_type': 'REGRESSION',
        'icon':       '🌱',
        'order':      1,
        'challenge':  'Figure out how much a crop will yield based on the daily sunlight and water it receives.',
        'takeaway':   'Linear regression is great at finding trends, but extreme outliers or a lack of history can completely throw off its predictions.',
        'try_it_out': 'Measure your own potted plant\'s sunlight and water for a week, and see if the AI can guess how tall it will get on day eight.',
        'variants': [
            {'name': 'perfect', 'label': 'Perfect Data',   'order': 1, 'description': 'A perfectly balanced data with optimal sunlight and water given for plant growth.'},
            {'name': 'tiny',    'label': 'Tiny Dataset',   'order': 2, 'description': 'Only five days of logs, leaving the AI with too little history to learn from.'},
            {'name': 'messy',   'label': 'Messy Sensors',  'order': 3, 'description': 'Broken sensors that record impossible things, like 10,000 hours of sunlight in a single day.'},
        ],
    },
    {
        'title':      'The Paper Plane Lab',
        'model_type': 'REGRESSION',
        'icon':       '✈️',
        'order':      2,
        'challenge':  'Predict how far a paper airplane will fly based on its wingspan and weight.',
        'takeaway':   'AI struggles with "extrapolation." If you only teach it about heavy cardboard planes, it will fail miserably when asked to predict the flight of a light origami plane.',
        'try_it_out': 'Fold a few different planes, throw them down the hallway, measure the distance, and challenge the AI with your own numbers.',
        'variants': [
            {'name': 'perfect', 'label': 'Perfect Flights', 'order': 1, 'description': 'Throws done indoors with zero wind.'},
            {'name': 'windy',   'label': 'The Windy Day',   'order': 2, 'description': 'Outdoor throws where sudden gusts of wind create confusing, random results.'},
            {'name': 'biased',  'label': 'Cardboard Only',  'order': 3, 'description': 'A biased dataset that only includes really heavy paper planes.'},
        ],
    },
    {
        'title':      'The Bean Sprout Project',
        'model_type': 'REGRESSION',
        'icon':       '🫘',
        'order':      3,
        'challenge':  'Predict the exact height of a bean sprout based on how many millilitres of water it gets.',
        'takeaway':   'Mathematical lines go on forever, but nature doesn\'t. Students learn that more water doesn\'t infinitely equal a taller plant.',
        'try_it_out': 'Track your own gardening attempts and input the watering amounts to see the AI\'s growth predictions.',
        'variants': [
            {'name': 'perfect',   'label': 'The Green Thumb', 'order': 1, 'description': 'Just the right amount of water leading to steady growth.'},
            {'name': 'overwater', 'label': 'The Flood',       'order': 2, 'description': 'Overwatered plants that actually stopped growing or died.'},
            {'name': 'wrong',     'label': 'The Cactus',      'order': 3, 'description': 'Data from a totally different plant that barely needs water.'},
        ],
    },
    {
        'title':      'The Study Score Predictor',
        'model_type': 'REGRESSION',
        'icon':       '📚',
        'order':      4,
        'challenge':  'Guess a student\'s math test score based on how many hours they spent studying.',
        'takeaway':   'Diminishing returns. Just a few extreme outliers (like the lucky guesser) can drag the AI\'s prediction line away from reality.',
        'try_it_out': 'Anonymously log your class\'s study hours and quiz scores to build a custom AI model just for your classroom.',
        'variants': [
            {'name': 'perfect',    'label': 'The Honest Class', 'order': 1, 'description': 'A clear trend where studying more leads to higher scores.'},
            {'name': 'guesser',    'label': 'The Guesser',      'order': 2, 'description': 'Data that includes a student who studied zero hours but guessed everything right and got 100%.'},
            {'name': 'allnighter', 'label': 'The All-Nighter',  'order': 3, 'description': 'Data showing that studying past 14 hours actually causes scores to drop from exhaustion.'},
        ],
    },
    {
        'title':      'The Lemonade Stand',
        'model_type': 'REGRESSION',
        'icon':       '🍋',
        'order':      5,
        'challenge':  'Predict how many cups of lemonade you will sell based on the outdoor temperature.',
        'takeaway':   'Correlation isn\'t causation. The AI can\'t predict reality perfectly if a major hidden variable (like changing the price) is ignored.',
        'try_it_out': 'Check your local weather forecast and feed the temperatures into the model to predict your weekend sales.',
        'variants': [
            {'name': 'perfect', 'label': 'Summer Vacation',   'order': 1, 'description': 'Hotter days consistently equal more sales.'},
            {'name': 'blizzard','label': 'The Blizzard',      'order': 2, 'description': 'Freezing days where sales drop to exactly zero.'},
            {'name': 'free',    'label': 'Free Lemonade Day', 'order': 3, 'description': 'The price was changed to $0, causing a massive spike in sales that the temperature can\'t explain.'},
        ],
    },
    {
        'title':      'The Speedrun Timer',
        'model_type': 'REGRESSION',
        'icon':       '🎮',
        'order':      6,
        'challenge':  'Estimate how many minutes it will take to beat a video game level based on the number of enemies in it.',
        'takeaway':   'Asking an AI trained only on tiny levels to predict a 500-enemy boss battle will give you a mathematically correct, but practically impossible answer.',
        'try_it_out': 'Time yourself playing a level, count the enemies, and see if you can beat the AI\'s time prediction.',
        'variants': [
            {'name': 'perfect', 'label': 'The Casual Gamer', 'order': 1, 'description': 'A steady pace where more enemies take more time to defeat.'},
            {'name': 'glitch',  'label': 'The Glitcher',     'order': 2, 'description': 'Players who use game glitches to skip 100 enemies in just 5 seconds.'},
            {'name': 'small',   'label': 'Level 1 Only',     'order': 3, 'description': 'The AI is only taught using tiny levels with 1 to 5 enemies.'},
        ],
    },
    {
        'title':      'The Bike Brake Test',
        'model_type': 'REGRESSION',
        'icon':       '🚲',
        'order':      7,
        'challenge':  'Predict how many metres it will take a bicycle to stop based on how fast it was going.',
        'takeaway':   'Context matters. An AI model trained in a safe environment (dry pavement) is dangerous to rely on in a different environment (ice).',
        'try_it_out': 'Ride your bike, drop a marker when you hit the brakes, measure the distance, and test the AI\'s accuracy.',
        'variants': [
            {'name': 'perfect', 'label': 'Dry Pavement',  'order': 1, 'description': 'A clean, safe, and predictable stopping curve.'},
            {'name': 'icy',     'label': 'The Icy Road',  'order': 2, 'description': 'Slippery conditions that make the stopping distances wildly longer.'},
            {'name': 'slow',    'label': 'The Snail Pace','order': 3, 'description': 'Data only collected from bikes moving at a slow walking speed.'},
        ],
    },

    {
        'title':      'The Social Media Trend',
        'model_type': 'REGRESSION',
        'icon':       '❤️',
        'order':      8,
        'challenge':  'Predict the number of comments on a post based on its number of likes.',
        'takeaway':   'Generally, the more likes a post gets, the more comments it tends to have. But sometimes an algorithmic anomaly or a disabled comment section can break this rule.',
        'try_it_out': 'Open Instagram, YouTube, or any social media app, pick 10 random posts, and log the likes (X) vs comments (Y).',
        'variants': [
            {'name': 'perfect', 'label': 'Viral Content',    'order': 1, 'description': 'Posts where high likes consistently correspond to high comments.'},
            {'name': 'disabled','label': 'Disabled Comments', 'order': 2, 'description': 'A post with 1,000,000 likes but 0 comments because the creator turned them off.'},
            {'name': 'bot',     'label': 'The Bot Attack',    'order': 3, 'description': 'A post with very few likes but massive amounts of bot spam comments.'},
        ],
    },

    # ═══════════════════════════════════════════════════════
    # PART 2 — CLASSIFICATION (7 scenarios)
    # ═══════════════════════════════════════════════════════
    {
        'title':      'The Chat Moderator',
        'model_type': 'CLASSIFICATION',
        'icon':       '💬',
        'order':      1,
        'challenge':  'Build a bot for a school gaming forum that reads chat messages and flags them as "Safe" or "Toxic."',
        'takeaway':   'The accuracy trap! An AI trained on imbalanced data can score 99% accuracy by just blindly guessing "Safe" every single time, making it useless in the real world.',
        'try_it_out': 'Type your own gaming slang into the chat to see if the AI accurately flags it or misunderstands you.',
        'variants': [
            {'name': 'balanced',   'label': 'Balanced Data',   'order': 1, 'description': 'An equal mix of friendly messages and toxic ones.'},
            {'name': 'imbalanced', 'label': 'Imbalanced Data', 'order': 2, 'description': '9,900 safe messages and only 100 toxic ones.'},
        ],
    },
    {
        'title':      'The Spam Catcher',
        'model_type': 'CLASSIFICATION',
        'icon':       '📧',
        'order':      2,
        'challenge':  'Teach an AI to read video titles and text messages and label them as "Safe" or "Clickbait/Spam."',
        'takeaway':   'AI only knows what you show it. If it learns that "ALL CAPS = SCAM," it will unfairly block harmless, excited text messages from your friends.',
        'try_it_out': 'Paste real YouTube video titles into the app to test how easily the model gets fooled.',
        'variants': [
            {'name': 'balanced', 'label': 'Balanced Data',      'order': 1, 'description': 'A good mix of boring messages and obvious clickbait.'},
            {'name': 'caps',     'label': 'The ALL CAPS Trick', 'order': 2, 'description': 'The only clue the AI was given for spam is capitalized letters.'},
            {'name': 'sarcasm',  'label': 'The Sarcastic Set',  'order': 3, 'description': 'Normal news uses exclamation points, but the scams use polite, formal language.'},
        ],
    },
    {
        'title':      'The Smart Trash Can',
        'model_type': 'CLASSIFICATION',
        'icon':       '🗑️',
        'order':      3,
        'challenge':  'Use a camera to look at cafeteria waste and sort it into "Recycle," "Compost," or "Trash."',
        'takeaway':   'Real life is messy. A clean piece of paper goes in recycling, but that exact same paper covered in pizza grease belongs in the trash. AI struggles when rules overlap.',
        'try_it_out': 'Hold your leftover lunch up to your webcam and see if the AI tells you the right bin to use.',
        'variants': [
            {'name': 'pristine',  'label': 'Pristine Trash', 'order': 1, 'description': 'Perfect, studio-quality photos of clean cans and whole apples.'},
            {'name': 'realworld', 'label': 'The Real World',  'order': 2, 'description': 'Crushed cans, crumpled paper, and half-eaten pizza boxes.'},
            {'name': 'biased',    'label': 'Mostly Plastic',  'order': 3, 'description': '990 photos of plastic bottles and almost no organic food waste.'},
        ],
    },
    {
        'title':      'The Gaming Bot Detector',
        'model_type': 'CLASSIFICATION',
        'icon':       '🤖',
        'order':      4,
        'challenge':  'Figure out if an online player is a "Human" or a "Cheating Bot" by looking at their clicks-per-second and reaction time.',
        'takeaway':   'If an AI is too strict, it will accidentally ban human players who are just really good at the game.',
        'try_it_out': 'Take a 10-second "click speed test" in your browser and see if the AI thinks you are a bot.',
        'variants': [
            {'name': 'clearcut', 'label': 'Clear Cut',      'order': 1, 'description': 'Bots clicking 50 times a second versus humans clicking 5 times a second.'},
            {'name': 'progamer', 'label': 'The Pro Gamer',  'order': 2, 'description': 'Includes human esports players who have insanely fast, bot-like reaction times.'},
            {'name': 'afkbot',   'label': 'The AFK Bot',   'order': 3, 'description': 'Cheating bots programmed to stand perfectly still to avoid getting caught.'},
        ],
    },
    {
        'title':      'The Forest Forager',
        'model_type': 'CLASSIFICATION',
        'icon':       '🍄',
        'order':      5,
        'challenge':  'Look at a mushroom\'s colour, spots, and shape, and decide if it is "Safe to Eat" or "Poisonous."',
        'takeaway':   'Fatal bias. If you train an AI on bad data, it learns lazy rules like "Red is bad, Brown is good," and might tell you to eat a highly toxic brown mushroom.',
        'try_it_out': 'Type in the traits of a mushroom you "found" in your backyard to see if you survive the AI\'s advice.',
        'variants': [
            {'name': 'diverse', 'label': 'The Diverse Forest', 'order': 1, 'description': 'A healthy mix of red/safe, red/poisonous, brown/safe, and brown/poisonous mushrooms.'},
            {'name': 'biased',  'label': 'Red = Danger',       'order': 2, 'description': 'A biased dataset where every single poisonous mushroom happens to be red.'},
        ],
    },
    {
        'title':      'The Dog Translator',
        'model_type': 'CLASSIFICATION',
        'icon':       '🐕',
        'order':      6,
        'challenge':  'Listen to an audio clip of a dog\'s bark and classify it as "Playful," "Hungry," or "Stranger Alert."',
        'takeaway':   'Demographic bias. An AI trained exclusively on small dogs will completely misunderstand the deep, booming bark of a Golden Retriever.',
        'try_it_out': 'Record your own dog barking (or try barking into the microphone yourself!) to see what emotion the AI detects.',
        'variants': [
            {'name': 'clean',       'label': 'The Quiet Room',    'order': 1, 'description': 'Perfect, crystal-clear audio recordings.'},
            {'name': 'noisy',       'label': 'The Dog Park',      'order': 2, 'description': 'Noisy recordings with wind, cars, and people shouting in the background.'},
            {'name': 'chihuahuas',  'label': 'Chihuahuas Only',   'order': 3, 'description': 'The AI was only trained on high-pitched small dogs.'},
        ],
    },
    {
        'title':      'The Magic Potion Sorter',
        'model_type': 'CLASSIFICATION',
        'icon':       '🧪',
        'order':      7,
        'challenge':  'Play the role of a wizard\'s apprentice and sort glowing liquids into "Healing Potions" or "Dangerous Acids" based on their pH level and thickness.',
        'takeaway':   '"Garbage In, Garbage Out." The AI completely relies on the humans who label the data. If the human makes typos, the AI learns the typos as facts.',
        'try_it_out': 'Mix safe kitchen liquids like vinegar and baking soda, test their pH, and ask the AI what kind of potion you made.',
        'variants': [
            {'name': 'clean',   'label': 'Distinct Potions', 'order': 1, 'description': 'Healing potions are always thick and basic; acids are watery and acidic.'},
            {'name': 'noisy',   'label': 'Switched Labels',  'order': 2, 'description': 'A dataset where a clumsy wizard accidentally entered 20% of the labels backward.'},
        ],
    },

    # ═══════════════════════════════════════════════════════
    # PART 3 — NEURAL NETWORK (2 scenarios)
    # ═══════════════════════════════════════════════════════
    {
        'title':      'The Self-Driving Eye',
        'model_type': 'NEURAL_NETWORK',
        'icon':       '🚗',
        'order':      1,
        'challenge':  'Train the computer vision system for a self-driving car so it can recognize handwritten numbers on speed limit signs.',
        'takeaway':   'Neural networks are very literal. Without a huge variety of data, an AI trained on perfectly upright numbers will fail to read a sign that is slightly tilted.',
        'try_it_out': 'Draw your own speed limit sign on a piece of paper, hold it up to the webcam, and see if the car knows how fast to go.',
        'variants': [
            {'name': 'highquality', 'label': 'High-Quality Data', 'order': 1, 'description': 'Thousands of perfectly centred, bright images.'},
            {'name': 'lowres',      'label': 'Low-Resolution',    'order': 2, 'description': 'Highly pixelated, blurry, and compressed images.'},
            {'name': 'rotated',     'label': 'Rotated Signs',     'order': 3, 'description': 'Images where the numbers are sideways, tilted, or upside down.'},
        ],
    },
    {
        'title':      'The Emotion Reader',
        'model_type': 'NEURAL_NETWORK',
        'icon':       '😊',
        'order':      2,
        'challenge':  'Train a neural network to look at a face and guess the emotion: Happy, Sad, or Surprised.',
        'takeaway':   'Overfitting. If the network only ever sees one person, it learns to recognise that specific person, not the universal concept of human emotion.',
        'try_it_out': 'Snap 10 pictures of yourself smiling and frowning via your webcam, train the AI, and then challenge your friends to try and fool it.',
        'variants': [
            {'name': 'diverse',     'label': 'Diverse Faces',     'order': 1, 'description': 'People photographed in different lighting, from different angles.'},
            {'name': 'sunglasses',  'label': 'The Sunglasses Set','order': 2, 'description': 'Faces partially covered by glasses, hats, or masks.'},
            {'name': 'oneperson',   'label': 'The "Same Person" Set', 'order': 3, 'description': '1,000 pictures of the exact same person making different faces — classic overfitting.'},
        ],
    },

    # ═══════════════════════════════════════════════════════
    # PART 4 — COMPUTER VISION (3 scenarios)
    # ═══════════════════════════════════════════════════════
    {
        'title':      'The Digit Detective',
        'model_type': 'COMPUTER_VISION',
        'icon':       '🔢',
        'order':      1,
        'challenge':  'Draw any digit (0-9) on the canvas and watch the AI decode it step-by-step through a 4-stage visual pipeline!',
        'takeaway':   'CNNs recognize patterns in pixel grids just like your brain recognizes shapes. The 4-stage pipeline shows exactly how the AI "sees" your handwriting.',
        'try_it_out': 'Draw the same digit 5 different ways — messy, tiny, huge, rotated — and see how the AI\'s confidence changes each time.',
        'variants': [
            {'name': 'clean', 'label': 'Clean Digits',   'order': 1, 'description': 'Well-formed, carefully drawn digits with clear strokes — the AI\'s easiest challenge.'},
            {'name': 'messy', 'label': 'Messy Scribbles', 'order': 2, 'description': 'Quick, rough handwriting with overlapping strokes — can the AI still read it?'},
            {'name': 'noisy', 'label': 'Noisy Input',     'order': 3, 'description': 'Digits drawn on a "dirty" background with random noise — testing the AI\'s preprocessing.'},
        ],
    },
    {
        'title':      'The Handwriting Decoder',
        'model_type': 'COMPUTER_VISION',
        'icon':       '✍️',
        'order':      2,
        'challenge':  'Write anything on the canvas and watch the AI convert your handwriting to typed text through image processing stages!',
        'takeaway':   'OCR (Optical Character Recognition) is one of the most common CV applications. It works by binarizing, segmenting, and then recognizing individual characters.',
        'try_it_out': 'Write your name in different styles — print, cursive, block letters — and see which style the AI reads best.',
        'variants': [
            {'name': 'print',   'label': 'Print Writing', 'order': 1, 'description': 'Clean, separated print letters — the easiest for OCR to decode.'},
            {'name': 'cursive', 'label': 'Cursive Flow',  'order': 2, 'description': 'Connected cursive writing — a tough challenge since characters overlap.'},
        ],
    },
    {
        'title':      'The Edge Explorer',
        'model_type': 'COMPUTER_VISION',
        'icon':       '🖼️',
        'order':      3,
        'challenge':  'See how AI breaks down any image into edges, textures, and features — revealing what a CNN "sees" under the hood!',
        'takeaway':   'Computer Vision models don\'t see images like humans do. They detect edges and gradients first, then build up to complex shapes and objects layer by layer.',
        'try_it_out': 'Draw a simple shape (circle, square, star) and see how the edge detector responds. Then try something complex!',
        'variants': [
            {'name': 'shapes',   'label': 'Simple Shapes',   'order': 1, 'description': 'Basic geometric shapes — circles, squares, triangles — to see clean edge detection.'},
            {'name': 'complex',  'label': 'Complex Scenes',  'order': 2, 'description': 'Detailed drawings with many overlapping features — watch the edge detector go wild!'},
            {'name': 'gradient', 'label': 'Gradient Art',    'order': 3, 'description': 'Smooth gradients and color transitions — testing how edges are detected in subtle changes.'},
        ],
    },
]


class Command(BaseCommand):
    help = 'Seed the database with all 16 CBSE AI Lab scenarios and their data variants.'

    def handle(self, *args, **options):
        created_count  = 0
        updated_count  = 0
        variant_count  = 0

        for data in SCENARIOS_DATA:
            variants_data = data.pop('variants')

            scenario, created = Scenario.objects.update_or_create(
                title=data['title'],
                model_type=data['model_type'],
                defaults=data,
            )

            if created:
                created_count += 1
                self.stdout.write(f'  Created: {scenario.title}')
            else:
                updated_count += 1
                self.stdout.write(f'  Updated: {scenario.title}')

            for v in variants_data:
                _, v_created = DataVariant.objects.update_or_create(
                    scenario=scenario,
                    name=v['name'],
                    defaults=v,
                )
                variant_count += 1

        self.stdout.write(self.style.SUCCESS(
            f'\nDone! {created_count} created, {updated_count} updated. '
            f'{variant_count} variants processed.'
        ))
