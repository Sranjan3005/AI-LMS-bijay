"""
regression/dataset_generators.py

Each function generates a realistic synthetic dataset for a specific
scenario + variant combination and returns it as CSV bytes.

These bytes are passed directly to core/sandbox.py as input.csv —
no files are stored on disk, no database writes happen here.

The generator is also called by the /preview/ endpoint to show
students the data before running the full experiment.

Naming convention: <scenario_slug>_<variant_name>()
"""

import io
import numpy as np
import pandas as pd


def _to_csv_bytes(df: pd.DataFrame) -> bytes:
    buf = io.BytesIO()
    df.to_csv(buf, index=False)
    return buf.getvalue()


# ═══════════════════════════════════════════════════════════════════════════
# 1. THE SMART GREENHOUSE  (sunlight_hrs, water_ml → yield_kg)
# ═══════════════════════════════════════════════════════════════════════════

def smart_greenhouse_perfect() -> bytes:
    rng = np.random.default_rng(seed=1)
    n = 40
    sunlight = rng.uniform(4, 14, n)
    water    = rng.uniform(20, 80, n)
    yield_   = 0.5 * sunlight + 0.15 * water + rng.normal(0, 0.5, n)
    yield_   = np.clip(yield_, 0, None)
    df = pd.DataFrame({'sunlight_hrs': sunlight.round(2), 'water_ml': water.round(1), 'yield_kg': yield_.round(2)})
    return _to_csv_bytes(df)

def smart_greenhouse_tiny() -> bytes:
    rng = np.random.default_rng(seed=2)
    sunlight = rng.uniform(4, 14, 5)
    water    = rng.uniform(20, 80, 5)
    yield_   = 0.5 * sunlight + 0.15 * water + rng.normal(0, 0.5, 5)
    df = pd.DataFrame({'sunlight_hrs': sunlight.round(2), 'water_ml': water.round(1), 'yield_kg': yield_.round(2)})
    return _to_csv_bytes(df)

def smart_greenhouse_messy() -> bytes:
    rng = np.random.default_rng(seed=3)
    n = 35
    sunlight = rng.uniform(4, 14, n)
    water    = rng.uniform(20, 80, n)
    yield_   = 0.5 * sunlight + 0.15 * water + rng.normal(0, 0.5, n)
    # Inject broken sensor readings
    sunlight[4]  = 10000   # impossible — broken sensor
    sunlight[11] = -50     # impossible — sensor fault
    water[17]    = -999    # sensor disconnected
    yield_[22]   = 500     # hardware glitch spike
    df = pd.DataFrame({'sunlight_hrs': sunlight.round(2), 'water_ml': water.round(1), 'yield_kg': yield_.round(2)})
    return _to_csv_bytes(df)


# ═══════════════════════════════════════════════════════════════════════════
# 2. THE PAPER PLANE LAB  (wingspan_cm, weight_g → distance_m)
# ═══════════════════════════════════════════════════════════════════════════

def paper_plane_lab_perfect() -> bytes:
    rng = np.random.default_rng(seed=10)
    n = 40
    wingspan = rng.uniform(10, 35, n)
    weight   = rng.uniform(2, 10, n)
    distance = 1.8 * wingspan - 0.9 * weight + rng.normal(0, 1.5, n)
    distance = np.clip(distance, 0, None)
    df = pd.DataFrame({'wingspan_cm': wingspan.round(1), 'weight_g': weight.round(2), 'distance_m': distance.round(2)})
    return _to_csv_bytes(df)

def paper_plane_lab_windy() -> bytes:
    rng = np.random.default_rng(seed=11)
    n = 40
    wingspan = rng.uniform(10, 35, n)
    weight   = rng.uniform(2, 10, n)
    # Wind adds large random noise — data becomes much harder to predict
    distance = 1.8 * wingspan - 0.9 * weight + rng.normal(0, 8, n)
    distance = np.clip(distance, 0, None)
    df = pd.DataFrame({'wingspan_cm': wingspan.round(1), 'weight_g': weight.round(2), 'distance_m': distance.round(2)})
    return _to_csv_bytes(df)

def paper_plane_lab_biased() -> bytes:
    """Only heavy cardboard planes — extrapolation bias."""
    rng = np.random.default_rng(seed=12)
    n = 40
    wingspan = rng.uniform(10, 35, n)
    weight   = rng.uniform(30, 60, n)   # Only very heavy planes
    distance = 1.8 * wingspan - 0.9 * weight + rng.normal(0, 1.5, n)
    distance = np.clip(distance, 0, None)
    df = pd.DataFrame({'wingspan_cm': wingspan.round(1), 'weight_g': weight.round(2), 'distance_m': distance.round(2)})
    return _to_csv_bytes(df)


# ═══════════════════════════════════════════════════════════════════════════
# 3. THE BEAN SPROUT PROJECT  (water_ml → height_cm)
# ═══════════════════════════════════════════════════════════════════════════

def bean_sprout_project_perfect() -> bytes:
    rng = np.random.default_rng(seed=20)
    n = 35
    water  = rng.uniform(50, 200, n)
    height = 0.08 * water + rng.normal(0, 1.5, n)
    height = np.clip(height, 0, None)
    df = pd.DataFrame({'water_ml': water.round(1), 'height_cm': height.round(2)})
    return _to_csv_bytes(df)

def bean_sprout_project_overwater() -> bytes:
    """Plants die when overwatered — non-linear relationship."""
    rng = np.random.default_rng(seed=21)
    water  = np.linspace(50, 500, 40)
    # Height rises then falls as plants drown
    height = -0.0003 * (water - 200)**2 + 15 + rng.normal(0, 1.5, 40)
    height = np.clip(height, 0, None)
    df = pd.DataFrame({'water_ml': water.round(1), 'height_cm': height.round(2)})
    return _to_csv_bytes(df)

def bean_sprout_project_wrong() -> bytes:
    """Cactus data — completely different plant, very low water need."""
    rng = np.random.default_rng(seed=22)
    n = 40
    water  = rng.uniform(5, 40, n)     # Cactus needs very little water
    height = 0.005 * water + 2 + rng.normal(0, 0.3, n)
    df = pd.DataFrame({'water_ml': water.round(1), 'height_cm': height.round(2)})
    return _to_csv_bytes(df)


# ═══════════════════════════════════════════════════════════════════════════
# 4. THE STUDY SCORE PREDICTOR  (study_hours → test_score)
# ═══════════════════════════════════════════════════════════════════════════

def study_score_predictor_perfect() -> bytes:
    rng = np.random.default_rng(seed=30)
    n = 40
    hours  = rng.uniform(0.5, 12, n)
    scores = np.clip(6 * hours + 30 + rng.normal(0, 5, n), 0, 100)
    df = pd.DataFrame({'study_hours': hours.round(1), 'test_score': scores.round(1)})
    return _to_csv_bytes(df)

def study_score_predictor_guesser() -> bytes:
    """One lucky guesser with 0 study hours and 100% score."""
    rng = np.random.default_rng(seed=31)
    n = 39
    hours  = rng.uniform(0.5, 12, n)
    scores = np.clip(6 * hours + 30 + rng.normal(0, 5, n), 0, 100)
    # Inject the outlier guesser
    hours  = np.append(hours, 0.0)
    scores = np.append(scores, 100.0)
    df = pd.DataFrame({'study_hours': hours.round(1), 'test_score': scores.round(1)})
    return _to_csv_bytes(df.sample(frac=1, random_state=42).reset_index(drop=True))

def study_score_predictor_allnighter() -> bytes:
    """Scores peak around 10 hours and drop from exhaustion after 14."""
    rng = np.random.default_rng(seed=32)
    hours  = np.linspace(0.5, 20, 45)
    scores = np.clip(-1.2 * (hours - 10)**2 + 95 + rng.normal(0, 4, 45), 0, 100)
    df = pd.DataFrame({'study_hours': hours.round(1), 'test_score': scores.round(1)})
    return _to_csv_bytes(df)


# ═══════════════════════════════════════════════════════════════════════════
# 5. THE LEMONADE STAND  (temperature_C → cups_sold)
# ═══════════════════════════════════════════════════════════════════════════

def lemonade_stand_perfect() -> bytes:
    rng = np.random.default_rng(seed=40)
    n = 40
    temp  = rng.uniform(20, 42, n)
    cups  = np.clip(3.5 * temp - 40 + rng.normal(0, 5, n), 0, None).round()
    df = pd.DataFrame({'temperature_C': temp.round(1), 'cups_sold': cups.astype(int)})
    return _to_csv_bytes(df)

def lemonade_stand_blizzard() -> bytes:
    """Winter days with zero sales — model struggles at the floor."""
    rng = np.random.default_rng(seed=41)
    # Mix of summer days and freezing days
    summer_temp = rng.uniform(25, 42, 28)
    winter_temp = rng.uniform(-5, 8, 12)
    temp  = np.concatenate([summer_temp, winter_temp])
    cups  = np.where(temp < 10, 0, np.clip(3.5 * temp - 40 + rng.normal(0, 5, 40), 0, None)).round()
    df = pd.DataFrame({'temperature_C': temp.round(1), 'cups_sold': cups.astype(int)})
    return _to_csv_bytes(df.sample(frac=1, random_state=1).reset_index(drop=True))

def lemonade_stand_free() -> bytes:
    """One day where price was $0 — massive unexplained spike."""
    rng = np.random.default_rng(seed=42)
    n = 39
    temp  = rng.uniform(20, 42, n)
    cups  = np.clip(3.5 * temp - 40 + rng.normal(0, 5, n), 0, None).round()
    # Free lemonade day — temperature was 28°C but sold 500 cups
    temp  = np.append(temp, 28.0)
    cups  = np.append(cups, 500.0)
    df = pd.DataFrame({'temperature_C': temp.round(1), 'cups_sold': cups.astype(int)})
    return _to_csv_bytes(df.sample(frac=1, random_state=2).reset_index(drop=True))


# ═══════════════════════════════════════════════════════════════════════════
# 6. THE SPEEDRUN TIMER  (enemy_count → time_minutes)
# ═══════════════════════════════════════════════════════════════════════════

def speedrun_timer_perfect() -> bytes:
    rng = np.random.default_rng(seed=50)
    n = 40
    enemies = rng.integers(5, 100, n)
    time    = np.clip(0.3 * enemies + 2 + rng.normal(0, 2, n), 1, None)
    df = pd.DataFrame({'enemy_count': enemies, 'time_minutes': time.round(2)})
    return _to_csv_bytes(df)

def speedrun_timer_glitch() -> bytes:
    """Glitchers skip 100 enemies in 5 seconds — massive outliers."""
    rng = np.random.default_rng(seed=51)
    n = 35
    enemies = rng.integers(5, 100, n)
    time    = np.clip(0.3 * enemies + 2 + rng.normal(0, 2, n), 1, None)
    # Inject 5 glitch runs
    glitch_enemies = np.array([80, 95, 70, 60, 100])
    glitch_time    = np.array([0.08, 0.05, 0.09, 0.07, 0.04])
    enemies = np.concatenate([enemies, glitch_enemies])
    time    = np.concatenate([time, glitch_time])
    df = pd.DataFrame({'enemy_count': enemies.astype(int), 'time_minutes': time.round(2)})
    return _to_csv_bytes(df)

def speedrun_timer_small() -> bytes:
    """Only tiny levels with 1–5 enemies — extrapolation will fail badly."""
    rng = np.random.default_rng(seed=52)
    n = 30
    enemies = rng.integers(1, 6, n)
    time    = np.clip(0.3 * enemies + 2 + rng.normal(0, 0.5, n), 1, None)
    df = pd.DataFrame({'enemy_count': enemies, 'time_minutes': time.round(2)})
    return _to_csv_bytes(df)


# ═══════════════════════════════════════════════════════════════════════════
# 7. THE BIKE BRAKE TEST  (speed_kmh → stopping_distance_m)
# ═══════════════════════════════════════════════════════════════════════════

def bike_brake_test_perfect() -> bytes:
    rng = np.random.default_rng(seed=60)
    n = 40
    speed    = rng.uniform(10, 50, n)
    distance = 0.05 * speed**2 + 0.5 * speed + rng.normal(0, 1, n)
    distance = np.clip(distance, 0, None)
    df = pd.DataFrame({'speed_kmh': speed.round(1), 'stopping_distance_m': distance.round(2)})
    return _to_csv_bytes(df)

def bike_brake_test_icy() -> bytes:
    """Icy road — stopping distances are 3–5x longer."""
    rng = np.random.default_rng(seed=61)
    n = 40
    speed    = rng.uniform(10, 50, n)
    # Ice multiplier makes stopping much longer
    distance = 0.18 * speed**2 + 1.5 * speed + rng.normal(0, 4, n)
    distance = np.clip(distance, 0, None)
    df = pd.DataFrame({'speed_kmh': speed.round(1), 'stopping_distance_m': distance.round(2)})
    return _to_csv_bytes(df)

def bike_brake_test_slow() -> bytes:
    """Only slow speeds (5–20 km/h) — model trained in safe range only."""
    rng = np.random.default_rng(seed=62)
    n = 30
    speed    = rng.uniform(5, 20, n)
    distance = 0.05 * speed**2 + 0.5 * speed + rng.normal(0, 0.5, n)
    distance = np.clip(distance, 0, None)
    df = pd.DataFrame({'speed_kmh': speed.round(1), 'stopping_distance_m': distance.round(2)})
    return _to_csv_bytes(df)


# ═══════════════════════════════════════════════════════════════════════════
# 8. THE SOCIAL MEDIA TREND  (likes → comments)
# ═══════════════════════════════════════════════════════════════════════════

def social_media_trend_perfect() -> bytes:
    rng = np.random.default_rng(seed=70)
    n = 40
    likes = rng.uniform(10, 1000, n).round()
    # approx 10% comments per like
    comments = np.clip(0.1 * likes + rng.normal(0, 10, n), 0, None).round()
    df = pd.DataFrame({'likes': likes.astype(int), 'comments': comments.astype(int)})
    return _to_csv_bytes(df)

def social_media_trend_disabled() -> bytes:
    rng = np.random.default_rng(seed=71)
    n = 39
    likes = rng.uniform(10, 1000, n).round()
    comments = np.clip(0.1 * likes + rng.normal(0, 10, n), 0, None).round()
    # Add disabled post
    likes = np.append(likes, 100000)
    comments = np.append(comments, 0)
    df = pd.DataFrame({'likes': likes.astype(int), 'comments': comments.astype(int)})
    return _to_csv_bytes(df.sample(frac=1, random_state=42).reset_index(drop=True))

def social_media_trend_bot() -> bytes:
    rng = np.random.default_rng(seed=72)
    n = 35
    likes = rng.uniform(10, 1000, n).round()
    comments = np.clip(0.1 * likes + rng.normal(0, 10, n), 0, None).round()
    # Add bot posts
    bot_likes = np.array([5, 12, 3, 20, 8])
    bot_comments = np.array([5000, 8000, 12000, 4500, 9000])
    likes = np.concatenate([likes, bot_likes])
    comments = np.concatenate([comments, bot_comments])
    df = pd.DataFrame({'likes': likes.astype(int), 'comments': comments.astype(int)})
    return _to_csv_bytes(df.sample(frac=1, random_state=42).reset_index(drop=True))


# ═══════════════════════════════════════════════════════════════════════════
# REGISTRY — maps (scenario_title_slug, variant_name) → generator function
# ═══════════════════════════════════════════════════════════════════════════

GENERATORS = {
    ('smart_greenhouse',      'perfect'):    smart_greenhouse_perfect,
    ('smart_greenhouse',      'tiny'):       smart_greenhouse_tiny,
    ('smart_greenhouse',      'messy'):      smart_greenhouse_messy,

    ('paper_plane_lab',       'perfect'):    paper_plane_lab_perfect,
    ('paper_plane_lab',       'windy'):      paper_plane_lab_windy,
    ('paper_plane_lab',       'biased'):     paper_plane_lab_biased,

    ('bean_sprout_project',   'perfect'):    bean_sprout_project_perfect,
    ('bean_sprout_project',   'overwater'):  bean_sprout_project_overwater,
    ('bean_sprout_project',   'wrong'):      bean_sprout_project_wrong,

    ('study_score_predictor', 'perfect'):    study_score_predictor_perfect,
    ('study_score_predictor', 'guesser'):    study_score_predictor_guesser,
    ('study_score_predictor', 'allnighter'): study_score_predictor_allnighter,

    ('lemonade_stand',        'perfect'):    lemonade_stand_perfect,
    ('lemonade_stand',        'blizzard'):   lemonade_stand_blizzard,
    ('lemonade_stand',        'free'):       lemonade_stand_free,

    ('speedrun_timer',        'perfect'):    speedrun_timer_perfect,
    ('speedrun_timer',        'glitch'):     speedrun_timer_glitch,
    ('speedrun_timer',        'small'):      speedrun_timer_small,

    ('bike_brake_test',       'perfect'):    bike_brake_test_perfect,
    ('bike_brake_test',       'icy'):        bike_brake_test_icy,
    ('bike_brake_test',       'slow'):       bike_brake_test_slow,

    ('social_media_trend',    'perfect'):    social_media_trend_perfect,
    ('social_media_trend',    'disabled'):   social_media_trend_disabled,
    ('social_media_trend',    'bot'):        social_media_trend_bot,
}


def _title_to_slug(title: str) -> str:
    """Convert 'The Smart Greenhouse' → 'smart_greenhouse'"""
    return title.lower().replace('the ', '').replace(' ', '_').strip()


def get_dataset(scenario_title: str, variant_name: str) -> bytes:
    """
    Main entry point called by executor.py and preview view.
    First checks if the variant has a custom data_payload in the DB.
    """
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
        raise KeyError(
            f'No dataset generator found for scenario="{scenario_title}" variant="{variant_name}". '
            f'Available keys: {list(GENERATORS.keys())}'
        )
    return GENERATORS[key]()


def get_preview_dataframe(scenario_title: str, variant_name: str):
    """
    Returns a pandas DataFrame of the first 10 rows for the preview endpoint.
    No Docker, no LLM — instant response.
    """
    import pandas as pd
    csv_bytes = get_dataset(scenario_title, variant_name)
    return pd.read_csv(io.BytesIO(csv_bytes))
