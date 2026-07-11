"""
management/commands/seed_scenarios.py

Seeds all 20 CBSE AI Lab scenarios into the database.
Safe to run multiple times — uses update_or_create, so re-running pushes
authored copy updates without duplicating rows.

Curation: 11 scenarios are student-facing (is_active=True) and carry the full
authored narrative layer (story / data_story / outcome_guide / guide_steps +
per-variant watch_for). The other 9 stay in the DB as drafts (is_active=False)
until their content is completed.

Usage:
    python manage.py seed_scenarios
"""

from django.core.management.base import BaseCommand
from scenarios.models import Scenario, DataVariant


SCENARIOS_DATA = [

    # ═══════════════════════════════════════════════════════
    # PART 1 — LINEAR REGRESSION (8 scenarios, 3 curated)
    # ═══════════════════════════════════════════════════════
    {
        'title':      'The Smart Greenhouse',
        'model_type': 'REGRESSION',
        'icon':       '🌱',
        'order':      1,
        'is_active':  False,   # draft — not yet in the student flow
        'challenge':  'Figure out how much a crop will yield based on the daily sunlight and water it receives.',
        'takeaway':   'Linear regression is great at finding trends, but extreme outliers or a lack of history can completely throw off its predictions.',
        'try_it_out': 'Measure your own potted plant\'s sunlight and water for a week, and see if the AI can guess how tall it will get on day eight.',
        'variants': [
            {'name': 'perfect', 'label': 'Perfect Data',   'order': 1, 'description': 'A perfectly balanced dataset with optimal sunlight and water for plant growth.'},
            {'name': 'tiny',    'label': 'Tiny Dataset',   'order': 2, 'description': 'Only five days of logs, leaving the AI with too little history to learn from.'},
            {'name': 'messy',   'label': 'Messy Sensors',  'order': 3, 'description': 'Broken sensors that record impossible things, like 10,000 hours of sunlight in a single day.'},
        ],
    },
    {
        'title':      'The Paper Plane Lab',
        'model_type': 'REGRESSION',
        'icon':       '✈️',
        'order':      2,
        'is_active':  True,
        'challenge':  'Predict how far a paper airplane will fly based on its wingspan and weight.',
        'takeaway':   'AI struggles with "extrapolation." If you only teach it about heavy cardboard planes, it will fail miserably when asked to predict the flight of a light origami plane.',
        'try_it_out': 'Fold a few different planes, throw them down the hallway, measure the distance, and challenge the AI with your own numbers.',
        'story':      'Your class is having a paper-plane championship on Friday, and you get exactly one final throw. Wouldn\'t it be great to know — before you fold — which wingspan and weight flies farthest? That is a prediction problem, and it is exactly what regression was invented for: learning the relationship between a design and its result.',
        'data_story': 'This data comes from an experiment you could run yourself: students folded planes with different wingspans and weights, threw each one down the same corridor, and measured the distance with a measuring tape. Every row is one throw — the design of the plane and how far it flew. Same thrower, same corridor, so the only things changing are the ones we measure.',
        'outcome_guide': 'Look at the line the model draws through the dots: it is the model\'s "rule of thumb" for wingspan vs distance. Check how close the dots sit to the line — tight means trustworthy predictions, scattered means the world is noisier than the rule. Then look at the edges: the model has never seen a plane lighter or wider than its training data, so predictions out there are guesses, not knowledge.',
        'guide_steps': [
            'Pick a data variant and read its "what to watch for" note first.',
            'Preview the table — find one row and say it out loud: "a plane with THIS wingspan flew THIS far."',
            'Train the model and look at the line it draws through the points.',
            'Ask it to predict a plane wider than anything in the data — do you trust that answer? Why not?',
        ],
        'variants': [
            {'name': 'perfect', 'label': 'Perfect Flights', 'order': 1,
             'description': 'Indoor throws with zero wind — every flight depends only on the plane\'s design.',
             'watch_for': 'The dots should hug the line closely. This is regression at its best: clean inputs, clear trend, confident predictions.'},
            {'name': 'windy',   'label': 'The Windy Day',   'order': 2,
             'description': 'Outdoor throws where sudden gusts push some planes further and slam others down.',
             'watch_for': 'Same planes, much messier dots. Watch the line try to find a trend inside random noise — and notice how much less you trust each prediction.'},
            {'name': 'biased',  'label': 'Cardboard Only',  'order': 3,
             'description': 'Every training plane was heavy cardboard — not a single light paper plane in the data.',
             'watch_for': 'The line looks fine for heavy planes. Now ask it about a light origami plane: it has never seen one, so its confident-looking answer is pure extrapolation. Confident and correct are not the same thing.'},
        ],
    },
    {
        'title':      'The Bean Sprout Project',
        'model_type': 'REGRESSION',
        'icon':       '🫘',
        'order':      3,
        'is_active':  False,
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
        'is_active':  True,
        'challenge':  'Guess a student\'s math test score based on how many hours they spent studying.',
        'takeaway':   'Diminishing returns. Just a few extreme outliers (like the lucky guesser) can drag the AI\'s prediction line away from reality.',
        'try_it_out': 'Anonymously log your class\'s study hours and quiz scores to build a custom AI model just for your classroom.',
        'story':      'Exams are coming, and everyone has the same question: "If I study two more hours, how many more marks will I actually get?" Instead of guessing, we can answer it with data. A regression model can learn the real relationship between study hours and scores — including the surprising parts, like where extra hours stop helping.',
        'data_story': 'Imagine your class kept an anonymous diary for one exam: each student wrote down how many hours they studied and, later, the score they got. Each row is one student. Nobody\'s name is attached — that\'s deliberate: we want the pattern, not the gossip. Notice this is honest, self-reported data, and real people sometimes break patterns.',
        'outcome_guide': 'The slope of the line is the interesting number: it says "roughly this many extra marks per extra hour." Check whether the dots near the top flatten out — that\'s diminishing returns, where the 10th hour helps far less than the 2nd. And hunt for outliers: one lucky guesser or one exhausted all-nighter can visibly tilt the whole line. Ask yourself: should one unusual student change the advice we give everyone?',
        'guide_steps': [
            'Choose a variant and predict, before training: how many marks per study-hour do you expect?',
            'Train the model and read the slope — was your guess close?',
            'Find the most unusual student (dot far from the line). What is their story?',
            'Try predicting for 2, 6 and 14 hours of study. Where does the model\'s advice stop making sense?',
        ],
        'variants': [
            {'name': 'perfect',    'label': 'The Honest Class', 'order': 1,
             'description': 'A clear, honest trend: students who studied more scored higher, with normal small variations.',
             'watch_for': 'A tidy upward slope. This is the "textbook" case — use it as your baseline before trying the tricky variants.'},
            {'name': 'guesser',    'label': 'The Guesser',      'order': 2,
             'description': 'One student studied zero hours, guessed every answer, and scored 100%.',
             'watch_for': 'Watch that single dot in the top-left corner drag the line upward at zero hours. One outlier is quietly changing the prediction for every other student — exactly how outliers poison real models.'},
            {'name': 'allnighter', 'label': 'The All-Nighter',  'order': 3,
             'description': 'Beyond 14 hours, exhausted students actually score LOWER — the pattern bends downward.',
             'watch_for': 'A straight line cannot bend. Watch the model try to force a straight rule onto a curved truth — this is why choosing the right kind of model matters as much as the data.'},
        ],
    },
    {
        'title':      'The Lemonade Stand',
        'model_type': 'REGRESSION',
        'icon':       '🍋',
        'order':      5,
        'is_active':  True,
        'challenge':  'Predict how many cups of lemonade you will sell based on the outdoor temperature.',
        'takeaway':   'Correlation isn\'t causation. The AI can\'t predict reality perfectly if a major hidden variable (like changing the price) is ignored.',
        'try_it_out': 'Check your local weather forecast and feed the temperatures into the model to predict your weekend sales.',
        'story':      'You run a lemonade stall outside your building. Some days you sell out by noon; other days you carry most of it back home. If you could predict tomorrow\'s sales from tomorrow\'s temperature, you would know exactly how many lemons to buy — no waste, no shortage. Shops, canteens and even railway caterers make this exact prediction every single day.',
        'data_story': 'For a month, you noted two numbers every evening: the day\'s top temperature (from the weather app) and the number of cups you sold (from your cash box). Each row is one day. It\'s simple, honest bookkeeping — and it hides one trap: your notebook never recorded the day you changed the price. Data only knows what you write down.',
        'outcome_guide': 'First check the direction of the line: hotter should mean more cups. Then use the slope as a business rule — "every extra degree sells about N more cups" — and test a prediction against a day you remember. Finally, look for days the line badly misses: those are usually a hidden variable at work (a price change, a school holiday, a cricket match). The model can only see the columns you gave it.',
        'guide_steps': [
            'Pick a variant and preview the data — find the hottest day and check what it sold.',
            'Train the model, then read its rule: about how many extra cups per extra degree?',
            'Ask it to predict sales for 30°C, then 45°C. Which prediction do you trust more, and why?',
            'Find the day the model got most wrong. What real-life reason could explain it?',
        ],
        'variants': [
            {'name': 'perfect', 'label': 'Summer Vacation',   'order': 1,
             'description': 'A clean month of holidays: hotter days steadily sold more cups.',
             'watch_for': 'A strong upward line with dots close to it. This is the trend at its clearest — remember what "healthy" looks like before you meet the messy variants.'},
            {'name': 'blizzard','label': 'The Blizzard',      'order': 2,
             'description': 'Includes freezing days where sales crash to exactly zero, no matter what.',
             'watch_for': 'Sales can\'t go below zero, but a straight line doesn\'t know that — watch it predict negative cups on the coldest days. Models happily produce impossible answers unless humans sanity-check them.'},
            {'name': 'free',    'label': 'Free Lemonade Day', 'order': 3,
             'description': 'One day the lemonade was FREE — a massive sales spike that temperature cannot explain.',
             'watch_for': 'One wild dot yanks the line upward. The model blames temperature because that\'s the only column it has — a perfect example of a hidden variable creating a false story.'},
        ],
    },
    {
        'title':      'The Speedrun Timer',
        'model_type': 'REGRESSION',
        'icon':       '🎮',
        'order':      6,
        'is_active':  False,
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
        'is_active':  False,
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
        'is_active':  False,
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
    # PART 2 — CLASSIFICATION (7 scenarios, 3 curated)
    # ═══════════════════════════════════════════════════════
    {
        'title':      'The Chat Moderator',
        'model_type': 'CLASSIFICATION',
        'icon':       '💬',
        'order':      1,
        'is_active':  False,
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
        'is_active':  True,
        'challenge':  'Teach an AI to read video titles and text messages and label them as "Safe" or "Clickbait/Spam."',
        'takeaway':   'AI only knows what you show it. If it learns that "ALL CAPS = SCAM," it will unfairly block harmless, excited text messages from your friends.',
        'try_it_out': 'Paste real YouTube video titles into the app to test how easily the model gets fooled.',
        'story':      'Every day, crores of scam messages — "You WON a FREE iPhone!!" — race towards Indian phones, and a classifier stands in the way. Your job is to train that guard: an AI that reads a message and sorts it into "Safe" or "Spam." The twist? The guard is only as smart as the examples you train it on.',
        'data_story': 'The training data is a pile of real-looking messages that humans have already labelled: this one is spam, this one is safe. That labelling step is the invisible hard work behind every classifier on Earth — real companies pay thousands of people to label messages exactly like this. Each variant changes WHICH examples the AI gets to study.',
        'outcome_guide': 'Don\'t just read the accuracy number — check WHAT the model got wrong. There are two very different mistakes: blocking a friend\'s innocent message (false alarm) and letting a scam through (a miss). Which mistake is worse here? Then try to work out the model\'s hidden rule (is it just counting capital letters?) and think of one message that would fool it.',
        'guide_steps': [
            'Pick a variant and skim a few example messages — could YOU spot the spam?',
            'Train the classifier and note its accuracy.',
            'Look at the mistakes: did it block safe messages, or let spam through? Which is worse?',
            'Guess the model\'s hidden rule, then invent one message that would fool it.',
        ],
        'variants': [
            {'name': 'balanced', 'label': 'Balanced Data',      'order': 1,
             'description': 'A healthy mix: ordinary messages, obvious clickbait, and everything labelled correctly.',
             'watch_for': 'Good accuracy AND sensible mistakes. This is your baseline — a classifier trained on fair, varied examples.'},
            {'name': 'caps',     'label': 'The ALL CAPS Trick', 'order': 2,
             'description': 'In this training set, the only clue separating spam from safe is CAPITAL LETTERS.',
             'watch_for': 'The model learns one lazy rule: "caps = scam." Watch it block your friend\'s excited "I WON THE MATCH!!" — a shortcut in the data becomes unfairness in the model.'},
            {'name': 'sarcasm',  'label': 'The Sarcastic Set',  'order': 3,
             'description': 'Here the real news shouts with exclamation marks while the scams are written in calm, polite language.',
             'watch_for': 'Everything the model learned about "shouty = spam" is now backwards. Notice how a model trained in one world can be confidently wrong in another.'},
        ],
    },
    {
        'title':      'The Smart Trash Can',
        'model_type': 'CLASSIFICATION',
        'icon':       '🗑️',
        'order':      3,
        'is_active':  True,
        'challenge':  'Use a camera to look at cafeteria waste and sort it into "Recycle," "Compost," or "Trash."',
        'takeaway':   'Real life is messy. A clean piece of paper goes in recycling, but that exact same paper covered in pizza grease belongs in the trash. AI struggles when rules overlap.',
        'try_it_out': 'Hold your leftover lunch up to your webcam and see if the AI tells you the right bin to use.',
        'story':      'Under Swachh Bharat, your school installs a smart dustbin: show it your waste, and it tells you the right bin — Recycle, Compost or Trash. Cities like Indore already sort lakhs of kilos of waste daily, and mis-sorted waste ruins whole batches of recycling. Your model is the brain of that bin.',
        'data_story': 'Volunteers photographed real cafeteria waste and labelled each photo with the correct bin. Straight away they hit the hard part: the same paper plate is "Recycle" when clean but "Trash" when soaked in curry. The labellers had to make judgement calls — and every judgement call they made is now baked into your training data.',
        'outcome_guide': 'With three bins, look at WHICH categories get confused with each other — that confusion pattern is more informative than the accuracy number. Greasy paper sitting between Recycle and Trash is exactly where the real world refuses to fit neat boxes. Ask: for a dustbin, is a wrong "Recycle" worse than a wrong "Trash"? (Hint: one contaminated batch ruins the lot.)',
        'guide_steps': [
            'Pick a variant and look at a few photos — would YOU know the right bin every time?',
            'Train the model and check the overall accuracy.',
            'Find which two bins get confused most. Why those two?',
            'Decide: which kind of mistake matters most for a real city\'s recycling plant?',
        ],
        'variants': [
            {'name': 'pristine',  'label': 'Pristine Trash', 'order': 1,
             'description': 'Studio-quality photos: spotless cans, whole apples, perfect lighting.',
             'watch_for': 'Impressive accuracy — but this bin has only ever seen a photoshoot. Hold that thought for the next variant.'},
            {'name': 'realworld', 'label': 'The Real World',  'order': 2,
             'description': 'Crushed cans, curry-stained paper, half-eaten pizza boxes — waste as it actually arrives.',
             'watch_for': 'Watch the accuracy drop from the pristine version. That gap IS the gap between the lab and reality — the single most common reason real AI projects fail.'},
            {'name': 'biased',    'label': 'Mostly Plastic',  'order': 3,
             'description': '990 photos of plastic bottles, almost nothing else.',
             'watch_for': 'The model becomes a plastic expert and a food-waste beginner. Check its accuracy per category, not overall — imbalance hides inside averages.'},
        ],
    },
    {
        'title':      'The Gaming Bot Detector',
        'model_type': 'CLASSIFICATION',
        'icon':       '🤖',
        'order':      4,
        'is_active':  False,
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
        'is_active':  True,
        'challenge':  'Look at a mushroom\'s colour, spots, and shape, and decide if it is "Safe to Eat" or "Poisonous."',
        'takeaway':   'Fatal bias. If you train an AI on bad data, it learns lazy rules like "Red is bad, Brown is good," and might tell you to eat a highly toxic brown mushroom.',
        'try_it_out': 'Type in the traits of a mushroom you "found" in your backyard to see if you survive the AI\'s advice.',
        'story':      'On a school trek in the Western Ghats, your group finds mushrooms everywhere. Some are food; some can put a person in hospital. You\'re building the classifier for a foraging app that decides "Safe to Eat" or "Poisonous" from a mushroom\'s colour, spots and shape. Unlike spam filters, this model\'s mistakes don\'t cost annoyance — they cost health. Stakes change everything.',
        'data_story': 'A botanist walked the forest and recorded each mushroom\'s features — colour, spots, cap shape — and its true nature, verified in a lab. Field data like this is expensive and slow to collect, so there\'s always a temptation to collect it from just one convenient patch of forest… and that shortcut is exactly what the biased variant shows you.',
        'outcome_guide': 'For a safety model, the accuracy number is almost beside the point — find the WORST mistake it makes. A "safe" mushroom called poisonous ruins a snack; a POISONOUS one called safe ruins a life. Check the biased variant\'s rule: if every poisonous example it studied was red, it has learned "red = danger" — and a brown toxic mushroom walks straight through. Would you eat anything this model approved?',
        'guide_steps': [
            'Read the variant description first — it tells you how the mushrooms were collected.',
            'Train the model and find its accuracy.',
            'Hunt for the most DANGEROUS mistake: any poisonous mushroom marked "safe"?',
            'Say the model\'s learned rule in one sentence. Would you trust it in a real forest?',
        ],
        'variants': [
            {'name': 'diverse', 'label': 'The Diverse Forest', 'order': 1,
             'description': 'Mushrooms of every combination: red/safe, red/poisonous, brown/safe, brown/poisonous.',
             'watch_for': 'Because colour alone can\'t separate the classes, the model is forced to learn real feature combinations — that struggle is what genuine learning looks like.'},
            {'name': 'biased',  'label': 'Red = Danger',       'order': 2,
             'description': 'A lazily-collected dataset where every poisonous mushroom just happens to be red.',
             'watch_for': 'The model aces its training data with one shortcut: "red = poison." Now show it a brown toxic mushroom. This is how biased data becomes dangerous advice — in mushrooms, in loans, in medicine.'},
        ],
    },
    {
        'title':      'The Dog Translator',
        'model_type': 'CLASSIFICATION',
        'icon':       '🐕',
        'order':      6,
        'is_active':  False,
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
        'is_active':  False,
        'challenge':  'Play the role of a wizard\'s apprentice and sort glowing liquids into "Healing Potions" or "Dangerous Acids" based on their pH level and thickness.',
        'takeaway':   '"Garbage In, Garbage Out." The AI completely relies on the humans who label the data. If the human makes typos, the AI learns the typos as facts.',
        'try_it_out': 'Mix safe kitchen liquids like vinegar and baking soda, test their pH, and ask the AI what kind of potion you made.',
        'variants': [
            {'name': 'clean',   'label': 'Distinct Potions', 'order': 1, 'description': 'Healing potions are always thick and basic; acids are watery and acidic.'},
            {'name': 'noisy',   'label': 'Switched Labels',  'order': 2, 'description': 'A dataset where a clumsy wizard accidentally entered 20% of the labels backward.'},
        ],
    },

    # ═══════════════════════════════════════════════════════
    # PART 3 — NEURAL NETWORK (2 scenarios, both curated)
    # ═══════════════════════════════════════════════════════
    {
        'title':      'The Self-Driving Eye',
        'model_type': 'NEURAL_NETWORK',
        'icon':       '🚗',
        'order':      1,
        'is_active':  True,
        'challenge':  'Train the computer vision system for a self-driving car so it can recognize handwritten numbers on speed limit signs.',
        'takeaway':   'Neural networks are very literal. Without a huge variety of data, an AI trained on perfectly upright numbers will fail to read a sign that is slightly tilted.',
        'try_it_out': 'Draw your own speed limit sign on a piece of paper, hold it up to the webcam, and see if the car knows how fast to go.',
        'story':      'A self-driving car races down a highway, and painted on a board ahead is its only instruction: the speed limit. The car\'s "eye" — a neural network — must read that number correctly every single time, in rain, at dusk, and when the board is a little crooked. Today you train that eye, and you\'ll discover how literal-minded a network really is.',
        'data_story': 'The training set is thousands of photos of digits, each labelled with the number it shows. Real sign photos are collected by cars driving around with cameras — which means the dataset inherits whatever those drives looked like. Sunny-day-only drives produce a sunny-day-only brain. Each variant simulates a different collection campaign.',
        'outcome_guide': 'Watch the accuracy climb as the network practises — that curve IS learning, happening in front of you. Then compare variants: the high-quality set sails upward, while the rotated set struggles, because the network never "understands" digits — it memorises pixel patterns. A tilted 7 is, to it, a brand-new pattern. Variety in training data is what turns memorisation into something like understanding.',
        'guide_steps': [
            'Pick a variant and read what kind of photos the "camera car" collected.',
            'Train and watch the accuracy curve — where does it climb fastest? Where does it flatten?',
            'Compare your final accuracy with a different variant\'s. What explains the gap?',
            'Verdict time: would you sit in a car whose eye trained ONLY on this variant?',
        ],
        'variants': [
            {'name': 'highquality', 'label': 'High-Quality Data', 'order': 1,
             'description': 'Thousands of bright, centred, perfectly upright digit photos.',
             'watch_for': 'A smooth, fast-climbing accuracy curve — the ideal classroom. But a car that only ever saw perfect signs has never really been tested.'},
            {'name': 'lowres',      'label': 'Low-Resolution',    'order': 2,
             'description': 'Pixelated, blurry, heavily compressed images — like photos taken at high speed.',
             'watch_for': 'Learning is slower and tops out lower: when pixels blur, an 8 and a 3 start to look alike. Notice WHICH digits get confused — blur destroys their distinguishing strokes.'},
            {'name': 'rotated',     'label': 'Rotated Signs',     'order': 3,
             'description': 'Digits that are tilted, sideways, even upside down — like signs knocked crooked by a storm.',
             'watch_for': 'The humbling one. You read a tilted 7 instantly; the network sees an alien pattern. Real self-driving teams fix this by deliberately rotating their training images — now you know why.'},
        ],
    },
    {
        'title':      'The Emotion Reader',
        'model_type': 'NEURAL_NETWORK',
        'icon':       '😊',
        'order':      2,
        'is_active':  True,
        'challenge':  'Train a neural network to look at a face and guess the emotion: Happy, Sad, or Surprised.',
        'takeaway':   'Overfitting. If the network only ever sees one person, it learns to recognise that specific person, not the universal concept of human emotion.',
        'try_it_out': 'Snap 10 pictures of yourself smiling and frowning via your webcam, train the AI, and then challenge your friends to try and fool it.',
        'story':      'Could a computer tell how you\'re feeling from a photo? Apps already try: cameras that detect drowsy drivers, tools that read patient discomfort. You\'re training a network to sort faces into Happy, Sad or Surprised — and you\'ll meet the most famous failure in machine learning: the model that memorises its training data instead of learning the idea. It has a name: overfitting.',
        'data_story': 'Volunteers were photographed making expressions, and each photo was labelled with the emotion they were asked to show. Who those volunteers are matters enormously: their ages, faces, lighting, angles. The "Same Person" variant shows what happens when the volunteers are… one very patient person photographed a thousand times.',
        'outcome_guide': 'The number that matters is accuracy on faces the network has NEVER seen. The overfitted variant may score brilliantly on its training faces and then collapse on a stranger — like a student who memorised last year\'s question paper. Compare training accuracy with test accuracy: a big gap between them is the fingerprint of overfitting. Diverse faces close that gap.',
        'guide_steps': [
            'Choose a variant and note WHO is in the training photos.',
            'Train the network and record its accuracy.',
            'Check: does it do as well on NEW faces as on training faces? Find the gap.',
            'Explain overfitting in your own words using the "Same Person" set as the example.',
        ],
        'variants': [
            {'name': 'diverse',     'label': 'Diverse Faces',     'order': 1,
             'description': 'Many different people, lighting conditions and camera angles.',
             'watch_for': 'Accuracy holds up on brand-new faces — the network was forced to learn what a smile IS, not what one person\'s smile looks like.'},
            {'name': 'sunglasses',  'label': 'The Sunglasses Set','order': 2,
             'description': 'Faces partly hidden by sunglasses, caps and masks.',
             'watch_for': 'Eyes carry a lot of emotion. Watch which emotions survive when the eyes disappear — and notice the network leaning on mouth shapes instead. It adapts to what it can see.'},
            {'name': 'oneperson',   'label': 'The "Same Person" Set', 'order': 3,
             'description': 'One thousand photos of the SAME person making different faces.',
             'watch_for': 'Spectacular training accuracy, embarrassing real-world accuracy. The network learned this one face, not human emotion — the cleanest demonstration of overfitting you will ever see.'},
        ],
    },

    # ═══════════════════════════════════════════════════════
    # PART 4 — COMPUTER VISION (3 scenarios, all curated + guided)
    # ═══════════════════════════════════════════════════════
    {
        'title':      'The Digit Detective',
        'model_type': 'COMPUTER_VISION',
        'icon':       '🔢',
        'order':      1,
        'is_active':  True,
        'challenge':  'Draw any digit (0-9) on the canvas and watch the AI decode it step-by-step through a 4-stage visual pipeline!',
        'takeaway':   'CNNs recognize patterns in pixel grids just like your brain recognizes shapes. The 4-stage pipeline shows exactly how the AI "sees" your handwriting.',
        'try_it_out': 'Draw the same digit 5 different ways — messy, tiny, huge, rotated — and see how the AI\'s confidence changes each time.',
        'story':      'When you post a letter, a machine at the sorting office reads the handwritten PIN code — lakhs of letters an hour, every hand-writing style in India. That machine\'s brain solves exactly this problem: turning a scribbled digit into a number a computer can use. Draw a digit and watch the same 4-stage pipeline run on YOUR handwriting.',
        'data_story': 'The model behind this was trained on 60,000 handwritten digits collected from real people — a legendary dataset called MNIST that has taught almost every AI student\'s first vision model. Every digit was written by a different hand, which is exactly why the model can read yours.',
        'outcome_guide': 'Follow the 4 stages: your drawing becomes a pixel grid, gets cleaned and centred, turns into an intensity map, and ends as ten confidence bars — one per digit. The bars are the honest part: a tall single bar means certainty; several medium bars mean your 7 also resembles a 1. That confidence spread is how real systems decide when to ask a human for help.',
        'guide_steps': [
            'Draw one big, bold digit in the centre of the canvas and run the pipeline.',
            'Read all four stages — find the exact moment your drawing becomes numbers.',
            'Now redraw the SAME digit three ways: tiny, messy, and tilted. Watch the confidence bars move.',
            'Find a drawing where the model is torn between two digits. Which stroke confused it?',
        ],
        'variants': [
            {'name': 'clean', 'label': 'Clean Digits',   'order': 1,
             'description': 'Carefully drawn, well-formed digits with clear strokes.',
             'watch_for': 'One tall confidence bar towering over the rest — the picture of a certain model. Note the number; you\'ll beat it soon.'},
            {'name': 'messy', 'label': 'Messy Scribbles', 'order': 2,
             'description': 'Fast, rough handwriting with overlapping strokes.',
             'watch_for': 'Watch confidence drop and split across bars. The pipeline\'s clean-up stage can rescue a lot — but not everything.'},
            {'name': 'noisy', 'label': 'Noisy Input',     'order': 3,
             'description': 'Digits on a "dirty" canvas with random specks and noise.',
             'watch_for': 'Keep your eye on stage 2 (Process): watch preprocessing try to separate ink from noise. Real scanners fight this battle on every crumpled envelope.'},
        ],
    },
    {
        'title':      'The Handwriting Decoder',
        'model_type': 'COMPUTER_VISION',
        'icon':       '✍️',
        'order':      2,
        'is_active':  True,
        'challenge':  'Write anything on the canvas and watch the AI convert your handwriting to typed text through image processing stages!',
        'takeaway':   'OCR (Optical Character Recognition) is one of the most common CV applications. It works by binarizing, segmenting, and then recognizing individual characters.',
        'try_it_out': 'Write your name in different styles — print, cursive, block letters — and see which style the AI reads best.',
        'story':      'Every DigiLocker certificate, every scanned Aadhaar form, every "search inside this PDF" — behind them all is OCR: software that turns pictures of writing into actual text. But whose handwriting does it read best? Run the family experiment: collect 3–4 different people\'s handwriting and find out whose the machine understands — and whose it refuses.',
        'data_story': 'OCR engines are trained on millions of text samples — but mostly neat, printed text. That training history is why they ace print and stumble on your grandmother\'s cursive. The data a model grew up on decides who it serves best: a lesson that applies to every AI, not just this one.',
        'outcome_guide': 'Compare the decoded text against what was actually written, per person. Print usually wins and joined cursive loses — because OCR must first CUT the writing into separate letters, and cursive refuses to be cut. When one person\'s writing scores worst, that\'s not an insult — it\'s a demonstration that models inherit the limits of their training data.',
        'guide_steps': [
            'Write one short word (like your name) in neat PRINT letters and run the decoder.',
            'Now collect handwriting from 3–4 different people — a friend, a parent, a sibling — same word each.',
            'Run each sample and note down what the AI read for each person.',
            'Rank them: whose handwriting won? Look at the binarize/segment stages to explain WHY.',
        ],
        'variants': [
            {'name': 'print',   'label': 'Print Writing', 'order': 1,
             'description': 'Clean, separated print letters — each letter standing alone.',
             'watch_for': 'Watch the segmentation stage slice the word neatly into letters. Separation is the secret: OCR reads letters, not words.'},
            {'name': 'cursive', 'label': 'Cursive Flow',  'order': 2,
             'description': 'Joined cursive writing, where letters flow into each other.',
             'watch_for': 'Now segmentation has nowhere to cut. Watch letters merge and the output garble — the exact reason forms say "PLEASE WRITE IN BLOCK LETTERS."'},
        ],
    },
    {
        'title':      'The Edge Explorer',
        'model_type': 'COMPUTER_VISION',
        'icon':       '🖼️',
        'order':      3,
        'is_active':  True,
        'challenge':  'See how AI breaks down any image into edges, textures, and features — revealing what a CNN "sees" under the hood!',
        'takeaway':   'Computer Vision models don\'t see images like humans do. They detect edges and gradients first, then build up to complex shapes and objects layer by layer.',
        'try_it_out': 'Draw a simple shape (circle, square, star) and see how the edge detector responds. Then try something complex!',
        'story':      'Before an AI can recognise a face, a cow on the road, or a tumour in an X-ray, it must first answer a much simpler question: WHERE DO THINGS BEGIN AND END? That answer comes from edges — sharp changes in brightness. Every vision model on Earth starts here, and today you get to watch this very first step happen on your own drawing.',
        'data_story': 'Here\'s the twist: the Sobel edge detector needs NO training data at all. It is pure mathematics — a small grid of numbers slid across the image, measuring how sharply brightness changes at every pixel. Comparing it with the trained models you\'ve met shows you the two families of computer vision: hand-written rules versus learned patterns.',
        'outcome_guide': 'Look at the 4 stages: colour drops away first, because edges live in brightness, not colour. The neon image shows where brightness changes fastest — your drawing reduced to pure outline. That outline is "layer 1" of every CNN; deeper layers combine these edges into corners, shapes, and eventually objects. When you look at the magenta overlay, you are literally seeing the first thing any vision AI sees.',
        'guide_steps': [
            'Draw one simple shape — a circle or a star — and run the pipeline.',
            'Compare stage 2 (grayscale) and stage 3 (edges): where did the colour go, and why doesn\'t it matter?',
            'Now draw something with texture inside it (a shaded patch). Does the inside light up, or only the outline?',
            'Upload or draw a complex scene and find one edge the detector MISSED. What made it invisible?',
        ],
        'variants': [
            {'name': 'shapes',   'label': 'Simple Shapes',   'order': 1,
             'description': 'Basic geometric shapes — circles, squares, triangles.',
             'watch_for': 'Crisp, clean outlines. Sharp brightness changes are an edge detector\'s favourite food.'},
            {'name': 'complex',  'label': 'Complex Scenes',  'order': 2,
             'description': 'Detailed drawings with many overlapping strokes and features.',
             'watch_for': 'Watch the detector light up EVERYTHING. More edges is not always more information — deeper CNN layers exist precisely to sort this jumble into meaning.'},
            {'name': 'gradient', 'label': 'Gradient Art',    'order': 3,
             'description': 'Smooth, gradual transitions instead of sharp lines.',
             'watch_for': 'The detector\'s weakness, live: brightness that changes SLOWLY barely registers. Now you know why foggy photos and soft shadows are hard for vision AI.'},
        ],
    },
]


class Command(BaseCommand):
    help = 'Seed the database with all 20 CBSE AI Lab scenarios (11 active/curated) and their data variants.'

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
                # user=None keeps seeded variants distinct from student-created
                # custom variants that may share a name (unique on scenario+name+user).
                _, v_created = DataVariant.objects.update_or_create(
                    scenario=scenario,
                    name=v['name'],
                    user=None,
                    defaults=v,
                )
                variant_count += 1

        active = Scenario.objects.filter(is_active=True).count()
        self.stdout.write(self.style.SUCCESS(
            f'\nDone! {created_count} created, {updated_count} updated '
            f'({active} active). {variant_count} variants processed.'
        ))
