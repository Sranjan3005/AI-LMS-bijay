"""
classification/dataset_generators.py

Generates feature-based tabular datasets for classification scenarios.
All datasets use NUMERIC FEATURES only so sklearn classifiers can train on them
without any NLP preprocessing.

Column naming convention:
    - Feature columns describe observable properties (measurable by a student)
    - Last column is always 'label' — the class to predict

Why numeric only?
    The goal is to teach classification concepts (bias, imbalance, overfitting)
    not natural language processing. Numeric features keep the sandbox code simple
    and training fast (< 5 seconds).
"""

import io
import numpy as np
import pandas as pd


def _to_csv_bytes(df: pd.DataFrame) -> bytes:
    buf = io.BytesIO()
    df.to_csv(buf, index=False)
    return buf.getvalue()


# ═══════════════════════════════════════════════════════════════════════════
# 1. THE CHAT MODERATOR
# Features: word_count, caps_ratio, exclamation_count, has_aggressive_word
# Label: Safe (0) / Toxic (1)
# ═══════════════════════════════════════════════════════════════════════════

def chat_moderator_balanced() -> bytes:
    rng = np.random.default_rng(seed=100)
    n = 200  # 100 safe, 100 toxic

    # Safe messages
    safe_word_count      = rng.integers(3, 25, 100)
    safe_caps_ratio      = rng.uniform(0.0, 0.15, 100)
    safe_exclamations    = rng.integers(0, 2, 100)
    safe_aggressive      = np.zeros(100, dtype=int)
    safe_labels          = np.zeros(100, dtype=int)

    # Toxic messages
    toxic_word_count     = rng.integers(2, 15, 100)
    toxic_caps_ratio     = rng.uniform(0.3, 1.0, 100)
    toxic_exclamations   = rng.integers(2, 8, 100)
    toxic_aggressive     = np.ones(100, dtype=int)
    toxic_labels         = np.ones(100, dtype=int)

    df = pd.DataFrame({
        'word_count':           np.concatenate([safe_word_count,  toxic_word_count]),
        'caps_ratio':           np.concatenate([safe_caps_ratio,  toxic_caps_ratio]).round(2),
        'exclamation_count':    np.concatenate([safe_exclamations, toxic_exclamations]),
        'has_aggressive_word':  np.concatenate([safe_aggressive,  toxic_aggressive]),
        'label':                np.concatenate([safe_labels,      toxic_labels]),
    })
    return _to_csv_bytes(df.sample(frac=1, random_state=1).reset_index(drop=True))


def chat_moderator_imbalanced() -> bytes:
    """9,900 safe messages and only 100 toxic — accuracy trap dataset."""
    rng = np.random.default_rng(seed=101)
    n_safe, n_toxic = 990, 100  # Scaled to 1090 total (manageable for sandbox)

    safe_word_count    = rng.integers(3, 25, n_safe)
    safe_caps_ratio    = rng.uniform(0.0, 0.15, n_safe)
    safe_exclamations  = rng.integers(0, 2, n_safe)
    safe_aggressive    = np.zeros(n_safe, dtype=int)
    safe_labels        = np.zeros(n_safe, dtype=int)

    toxic_word_count   = rng.integers(2, 15, n_toxic)
    toxic_caps_ratio   = rng.uniform(0.3, 1.0, n_toxic)
    toxic_exclamations = rng.integers(2, 8, n_toxic)
    toxic_aggressive   = np.ones(n_toxic, dtype=int)
    toxic_labels       = np.ones(n_toxic, dtype=int)

    df = pd.DataFrame({
        'word_count':          np.concatenate([safe_word_count,  toxic_word_count]),
        'caps_ratio':          np.concatenate([safe_caps_ratio,  toxic_caps_ratio]).round(2),
        'exclamation_count':   np.concatenate([safe_exclamations, toxic_exclamations]),
        'has_aggressive_word': np.concatenate([safe_aggressive,  toxic_aggressive]),
        'label':               np.concatenate([safe_labels,      toxic_labels]),
    })
    return _to_csv_bytes(df.sample(frac=1, random_state=2).reset_index(drop=True))


# ═══════════════════════════════════════════════════════════════════════════
# 2. THE SPAM CATCHER
# Features: word_count, caps_ratio, has_free_word, link_count, exclamation_count
# Label: Safe (0) / Spam (1)
# ═══════════════════════════════════════════════════════════════════════════

def spam_catcher_balanced() -> bytes:
    rng = np.random.default_rng(seed=200)
    n = 150

    safe_wc   = rng.integers(5, 30, n)
    safe_caps = rng.uniform(0.0, 0.1, n)
    safe_free = rng.integers(0, 1, n)
    safe_link = rng.integers(0, 1, n)
    safe_exc  = rng.integers(0, 2, n)
    safe_lbl  = np.zeros(n, dtype=int)

    spam_wc   = rng.integers(3, 20, n)
    spam_caps = rng.uniform(0.2, 0.9, n)
    spam_free = rng.integers(1, 2, n)
    spam_link = rng.integers(2, 6, n)
    spam_exc  = rng.integers(3, 10, n)
    spam_lbl  = np.ones(n, dtype=int)

    df = pd.DataFrame({
        'word_count':       np.concatenate([safe_wc,   spam_wc]),
        'caps_ratio':       np.concatenate([safe_caps, spam_caps]).round(2),
        'has_free_word':    np.concatenate([safe_free, spam_free]),
        'link_count':       np.concatenate([safe_link, spam_link]),
        'exclamation_count':np.concatenate([safe_exc,  spam_exc]),
        'label':            np.concatenate([safe_lbl,  spam_lbl]),
    })
    return _to_csv_bytes(df.sample(frac=1, random_state=3).reset_index(drop=True))


def spam_catcher_caps() -> bytes:
    """Only feature given is caps_ratio — model learns ALL CAPS = spam (wrong bias)."""
    rng = np.random.default_rng(seed=201)
    n = 150
    # Safe messages can also have caps, spam has lots of caps
    caps_safe = rng.uniform(0.0, 0.25, n)
    caps_spam = rng.uniform(0.6, 1.0, n)
    # Deliberately ONLY include caps_ratio as feature
    df = pd.DataFrame({
        'caps_ratio': np.concatenate([caps_safe, caps_spam]).round(2),
        'label':      np.concatenate([np.zeros(n), np.ones(n)]).astype(int),
    })
    return _to_csv_bytes(df.sample(frac=1, random_state=4).reset_index(drop=True))


def spam_catcher_sarcasm() -> bytes:
    """Spam uses formal polite language; real news uses exclamations."""
    rng = np.random.default_rng(seed=202)
    n = 150
    # Safe news articles: excited, lots of exclamations, low caps
    safe_caps = rng.uniform(0.05, 0.2, n)
    safe_exc  = rng.integers(3, 8, n)
    # Spam: polite formal tone, no exclamations, no caps
    spam_caps = rng.uniform(0.0, 0.05, n)
    spam_exc  = rng.integers(0, 1, n)
    df = pd.DataFrame({
        'caps_ratio':        np.concatenate([safe_caps, spam_caps]).round(2),
        'exclamation_count': np.concatenate([safe_exc,  spam_exc]),
        'label':             np.concatenate([np.zeros(n), np.ones(n)]).astype(int),
    })
    return _to_csv_bytes(df.sample(frac=1, random_state=5).reset_index(drop=True))


# ═══════════════════════════════════════════════════════════════════════════
# 3. THE SMART TRASH CAN
# Features: material_code, is_wet, is_crushed, size_cm
# Label: Recycle (0) / Compost (1) / Trash (2)
# material_code: plastic=0, paper=1, food=2, metal=3
#
# NOTE: every feature here must be readable BY A CAMERA — the scenario's whole
# story is "show the bin your waste". (This used to carry weight_g, which a
# camera cannot possibly measure; size_cm is the honest stand-in, since a camera
# can estimate an object's apparent size from its bounding box.)
# ═══════════════════════════════════════════════════════════════════════════

def smart_trash_can_pristine() -> bytes:
    rng = np.random.default_rng(seed=300)
    records = []
    # Clean, predictable data
    for _ in range(80):
        records.append([0, 0, 0, rng.uniform(10, 30), 0])   # Dry plastic bottle → Recycle
        records.append([1, 0, 0, rng.uniform(5, 25),  0])   # Dry paper → Recycle
        records.append([2, 1, 0, rng.uniform(4, 18),  1])   # Wet food → Compost
        records.append([3, 0, 0, rng.uniform(8, 16),  0])   # Metal can → Recycle
    rng.shuffle(records)
    df = pd.DataFrame(records[:200], columns=['material_code', 'is_wet', 'is_crushed', 'size_cm', 'label'])
    df['size_cm'] = df['size_cm'].round(1)
    return _to_csv_bytes(df)


def smart_trash_can_realworld() -> bytes:
    """Real world: greasy pizza boxes are trash, crushed cans are still recycled."""
    rng = np.random.default_rng(seed=301)
    records = []
    for _ in range(50):
        records.append([1, 1, 0, rng.uniform(5, 25),  2])   # Wet/greasy paper → Trash
        records.append([0, 0, 1, rng.uniform(6, 20),  0])   # Crushed plastic → still Recycle
        records.append([2, 1, 0, rng.uniform(4, 18),  1])   # Food → Compost
        records.append([1, 0, 0, rng.uniform(5, 25),  0])   # Dry paper → Recycle
    df = pd.DataFrame(records, columns=['material_code', 'is_wet', 'is_crushed', 'size_cm', 'label'])
    df['size_cm'] = df['size_cm'].round(1)
    return _to_csv_bytes(df.sample(frac=1, random_state=6).reset_index(drop=True))


def smart_trash_can_biased() -> bytes:
    """990 plastic bottle samples, almost no food waste — severe class imbalance."""
    rng = np.random.default_rng(seed=302)
    # 170 plastic recycle, 15 compost, 15 trash
    records = []
    for _ in range(170):
        records.append([0, 0, 0, rng.uniform(10, 30), 0])   # Plastic → Recycle
    for _ in range(15):
        records.append([2, 1, 0, rng.uniform(4, 18), 1])    # Food → Compost
        records.append([1, 1, 0, rng.uniform(5, 25), 2])    # Greasy paper → Trash
    df = pd.DataFrame(records, columns=['material_code', 'is_wet', 'is_crushed', 'size_cm', 'label'])
    df['size_cm'] = df['size_cm'].round(1)
    return _to_csv_bytes(df.sample(frac=1, random_state=7).reset_index(drop=True))


# ═══════════════════════════════════════════════════════════════════════════
# 4. THE GAMING BOT DETECTOR
# Features: clicks_per_second, reaction_time_ms, move_variance
# Label: Human (0) / Bot (1)
# ═══════════════════════════════════════════════════════════════════════════

def gaming_bot_detector_clearcut() -> bytes:
    rng = np.random.default_rng(seed=400)
    n = 150
    # Humans: 3-8 CPS, slow reaction, variable movement
    h_cps  = rng.uniform(3, 8, n)
    h_rt   = rng.uniform(150, 400, n)
    h_var  = rng.uniform(0.4, 1.0, n)
    # Bots: 40-60 CPS, instant reaction, perfectly uniform movement
    b_cps  = rng.uniform(40, 60, n)
    b_rt   = rng.uniform(1, 15, n)
    b_var  = rng.uniform(0.0, 0.05, n)
    df = pd.DataFrame({
        'clicks_per_second':  np.concatenate([h_cps,  b_cps]).round(1),
        'reaction_time_ms':   np.concatenate([h_rt,   b_rt]).round(1),
        'move_variance':      np.concatenate([h_var,  b_var]).round(3),
        'label':              np.concatenate([np.zeros(n), np.ones(n)]).astype(int),
    })
    return _to_csv_bytes(df.sample(frac=1, random_state=8).reset_index(drop=True))


def gaming_bot_detector_progamer() -> bytes:
    """Pro gamers have bot-like speed — classifier will wrongly ban them."""
    rng = np.random.default_rng(seed=401)
    n = 120
    # Regular humans
    h_cps  = rng.uniform(3, 8, n)
    h_rt   = rng.uniform(150, 400, n)
    h_var  = rng.uniform(0.4, 1.0, n)
    # Pro gamers — fast but still variable
    p_cps  = rng.uniform(18, 35, 30)
    p_rt   = rng.uniform(20, 60, 30)
    p_var  = rng.uniform(0.2, 0.5, 30)
    # Bots
    b_cps  = rng.uniform(40, 60, n)
    b_rt   = rng.uniform(1, 15, n)
    b_var  = rng.uniform(0.0, 0.05, n)
    df = pd.DataFrame({
        'clicks_per_second': np.concatenate([h_cps, p_cps, b_cps]).round(1),
        'reaction_time_ms':  np.concatenate([h_rt,  p_rt,  b_rt]).round(1),
        'move_variance':     np.concatenate([h_var, p_var, b_var]).round(3),
        'label':             np.concatenate([np.zeros(n+30), np.ones(n)]).astype(int),
    })
    return _to_csv_bytes(df.sample(frac=1, random_state=9).reset_index(drop=True))


def gaming_bot_detector_afkbot() -> bytes:
    """AFK bots stand still — they have very slow CPS but zero variance."""
    rng = np.random.default_rng(seed=402)
    n = 120
    h_cps  = rng.uniform(3, 8, n)
    h_rt   = rng.uniform(150, 400, n)
    h_var  = rng.uniform(0.4, 1.0, n)
    # AFK bots look human in CPS/reaction but have zero movement variance
    a_cps  = rng.uniform(0, 2, 30)
    a_rt   = rng.uniform(300, 600, 30)
    a_var  = rng.uniform(0.0, 0.01, 30)
    b_cps  = rng.uniform(40, 60, n)
    b_rt   = rng.uniform(1, 15, n)
    b_var  = rng.uniform(0.0, 0.05, n)
    df = pd.DataFrame({
        'clicks_per_second': np.concatenate([h_cps, a_cps, b_cps]).round(1),
        'reaction_time_ms':  np.concatenate([h_rt,  a_rt,  b_rt]).round(1),
        'move_variance':     np.concatenate([h_var, a_var, b_var]).round(3),
        'label':             np.concatenate([np.zeros(n), np.ones(n+30)]).astype(int),
    })
    return _to_csv_bytes(df.sample(frac=1, random_state=10).reset_index(drop=True))


# ═══════════════════════════════════════════════════════════════════════════
# 5. THE FOREST FORAGER
# Features: color_code (red=0, brown=1, white=2), has_spots, cap_width_cm, height_cm
# Label: Safe (0) / Poisonous (1)
# ═══════════════════════════════════════════════════════════════════════════

def forest_forager_diverse() -> bytes:
    rng = np.random.default_rng(seed=500)
    records = []
    # Red safe mushrooms
    for _ in range(50):
        records.append([0, rng.integers(0,2), rng.uniform(3,12), rng.uniform(5,20), 0])
    # Red poisonous mushrooms
    for _ in range(50):
        records.append([0, rng.integers(0,2), rng.uniform(2,8),  rng.uniform(3,15), 1])
    # Brown safe mushrooms
    for _ in range(50):
        records.append([1, rng.integers(0,2), rng.uniform(4,15), rng.uniform(6,25), 0])
    # Brown poisonous mushrooms
    for _ in range(50):
        records.append([1, rng.integers(0,2), rng.uniform(2,10), rng.uniform(3,18), 1])
    df = pd.DataFrame(records, columns=['color_code', 'has_spots', 'cap_width_cm', 'height_cm', 'label'])
    df[['cap_width_cm', 'height_cm']] = df[['cap_width_cm', 'height_cm']].round(1)
    return _to_csv_bytes(df.sample(frac=1, random_state=11).reset_index(drop=True))


def forest_forager_biased() -> bytes:
    """Every poisonous mushroom is red, safe ones are brown — lazy color rule."""
    rng = np.random.default_rng(seed=501)
    records = []
    for _ in range(100):
        records.append([1, rng.integers(0,2), rng.uniform(4,15), rng.uniform(6,25), 0])  # Brown = Safe
        records.append([0, rng.integers(0,2), rng.uniform(2,8),  rng.uniform(3,15), 1])  # Red = Poisonous
    df = pd.DataFrame(records, columns=['color_code', 'has_spots', 'cap_width_cm', 'height_cm', 'label'])
    df[['cap_width_cm', 'height_cm']] = df[['cap_width_cm', 'height_cm']].round(1)
    return _to_csv_bytes(df.sample(frac=1, random_state=12).reset_index(drop=True))


# ═══════════════════════════════════════════════════════════════════════════
# 6. THE DOG TRANSLATOR
# Features: pitch_hz, duration_ms, amplitude_db
# Label: Playful (0) / Hungry (1) / Alert (2)
# ═══════════════════════════════════════════════════════════════════════════

def dog_translator_clean() -> bytes:
    rng = np.random.default_rng(seed=600)
    n = 80
    # Playful: medium pitch, short, loud
    p_pitch = rng.uniform(500, 900, n); p_dur = rng.uniform(100, 300, n); p_amp = rng.uniform(60, 80, n)
    # Hungry: low pitch, long, medium volume
    h_pitch = rng.uniform(200, 450, n); h_dur = rng.uniform(400, 800, n); h_amp = rng.uniform(45, 65, n)
    # Alert: high pitch, very short, very loud
    a_pitch = rng.uniform(900, 1500, n); a_dur = rng.uniform(50, 150, n); a_amp = rng.uniform(75, 95, n)
    df = pd.DataFrame({
        'pitch_hz':    np.concatenate([p_pitch, h_pitch, a_pitch]).round(0),
        'duration_ms': np.concatenate([p_dur,   h_dur,   a_dur]).round(0),
        'amplitude_db':np.concatenate([p_amp,   h_amp,   a_amp]).round(1),
        'label':       np.concatenate([np.zeros(n), np.ones(n), np.full(n, 2)]).astype(int),
    })
    return _to_csv_bytes(df.sample(frac=1, random_state=13).reset_index(drop=True))


def dog_translator_noisy() -> bytes:
    """Background noise corrupts amplitude readings."""
    rng = np.random.default_rng(seed=601)
    n = 80
    p_pitch = rng.uniform(500, 900, n); p_dur = rng.uniform(100, 300, n)
    h_pitch = rng.uniform(200, 450, n); h_dur = rng.uniform(400, 800, n)
    a_pitch = rng.uniform(900, 1500, n); a_dur = rng.uniform(50, 150, n)
    # Add massive noise to amplitude — feature becomes useless
    noise_amp = rng.uniform(30, 100, n*3)
    df = pd.DataFrame({
        'pitch_hz':    np.concatenate([p_pitch, h_pitch, a_pitch]).round(0),
        'duration_ms': np.concatenate([p_dur,   h_dur,   a_dur]).round(0),
        'amplitude_db': noise_amp.round(1),
        'label':       np.concatenate([np.zeros(n), np.ones(n), np.full(n, 2)]).astype(int),
    })
    return _to_csv_bytes(df.sample(frac=1, random_state=14).reset_index(drop=True))


def dog_translator_chihuahuas() -> bytes:
    """Only small dog barks (high pitch) — model fails on big dogs."""
    rng = np.random.default_rng(seed=602)
    n = 80
    # All pitches are in the high range (Chihuahua voice)
    p_pitch = rng.uniform(800, 1200, n); p_dur = rng.uniform(100, 300, n); p_amp = rng.uniform(55, 75, n)
    h_pitch = rng.uniform(700, 1000, n); h_dur = rng.uniform(400, 800, n); h_amp = rng.uniform(45, 60, n)
    a_pitch = rng.uniform(900, 1500, n); a_dur = rng.uniform(50, 150, n); a_amp = rng.uniform(70, 90, n)
    df = pd.DataFrame({
        'pitch_hz':    np.concatenate([p_pitch, h_pitch, a_pitch]).round(0),
        'duration_ms': np.concatenate([p_dur,   h_dur,   a_dur]).round(0),
        'amplitude_db':np.concatenate([p_amp,   h_amp,   a_amp]).round(1),
        'label':       np.concatenate([np.zeros(n), np.ones(n), np.full(n, 2)]).astype(int),
    })
    return _to_csv_bytes(df.sample(frac=1, random_state=15).reset_index(drop=True))


# ═══════════════════════════════════════════════════════════════════════════
# 7. THE MAGIC POTION SORTER
# Features: pH, viscosity_cp
# Label: Healing (0) / Acid (1)
# ═══════════════════════════════════════════════════════════════════════════

def magic_potion_sorter_clean() -> bytes:
    rng = np.random.default_rng(seed=700)
    n = 120
    # Healing: high pH (basic), high viscosity (thick)
    h_ph  = rng.uniform(8.0, 14.0, n)
    h_vis = rng.uniform(200, 600, n)
    # Acid: low pH (acidic), low viscosity (watery)
    a_ph  = rng.uniform(0.5, 6.0, n)
    a_vis = rng.uniform(5, 80, n)
    df = pd.DataFrame({
        'pH':            np.concatenate([h_ph,  a_ph]).round(2),
        'viscosity_cp':  np.concatenate([h_vis, a_vis]).round(1),
        'label':         np.concatenate([np.zeros(n), np.ones(n)]).astype(int),
    })
    return _to_csv_bytes(df.sample(frac=1, random_state=16).reset_index(drop=True))


def magic_potion_sorter_noisy() -> bytes:
    """20% of labels are flipped by the clumsy wizard — garbage in, garbage out."""
    rng = np.random.default_rng(seed=701)
    n = 120
    h_ph  = rng.uniform(8.0, 14.0, n); h_vis = rng.uniform(200, 600, n)
    a_ph  = rng.uniform(0.5, 6.0, n);  a_vis = rng.uniform(5, 80, n)
    labels = np.concatenate([np.zeros(n), np.ones(n)]).astype(int)
    ph     = np.concatenate([h_ph,  a_ph]).round(2)
    vis    = np.concatenate([h_vis, a_vis]).round(1)
    # Flip 20% of labels randomly
    flip_idx = rng.choice(len(labels), size=int(0.2 * len(labels)), replace=False)
    labels[flip_idx] = 1 - labels[flip_idx]
    df = pd.DataFrame({'pH': ph, 'viscosity_cp': vis, 'label': labels})
    return _to_csv_bytes(df.sample(frac=1, random_state=17).reset_index(drop=True))


# ═══════════════════════════════════════════════════════════════════════════
# REGISTRY
# ═══════════════════════════════════════════════════════════════════════════

GENERATORS = {
    ('chat_moderator',       'balanced'):   chat_moderator_balanced,
    ('chat_moderator',       'imbalanced'): chat_moderator_imbalanced,

    ('spam_catcher',         'balanced'):   spam_catcher_balanced,
    ('spam_catcher',         'caps'):       spam_catcher_caps,
    ('spam_catcher',         'sarcasm'):    spam_catcher_sarcasm,

    ('smart_trash_can',      'pristine'):   smart_trash_can_pristine,
    ('smart_trash_can',      'realworld'):  smart_trash_can_realworld,
    ('smart_trash_can',      'biased'):     smart_trash_can_biased,

    ('gaming_bot_detector',  'clearcut'):   gaming_bot_detector_clearcut,
    ('gaming_bot_detector',  'progamer'):   gaming_bot_detector_progamer,
    ('gaming_bot_detector',  'afkbot'):     gaming_bot_detector_afkbot,

    ('forest_forager',       'diverse'):    forest_forager_diverse,
    ('forest_forager',       'biased'):     forest_forager_biased,

    ('dog_translator',       'clean'):      dog_translator_clean,
    ('dog_translator',       'noisy'):      dog_translator_noisy,
    ('dog_translator',       'chihuahuas'): dog_translator_chihuahuas,

    ('magic_potion_sorter',  'clean'):      magic_potion_sorter_clean,
    ('magic_potion_sorter',  'noisy'):      magic_potion_sorter_noisy,
}


def _title_to_slug(title: str) -> str:
    return title.lower().replace('the ', '').replace(' ', '_').strip()


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
        raise KeyError(
            f'No generator for scenario="{scenario_title}" variant="{variant_name}". '
            f'Key tried: {key}'
        )
    return GENERATORS[key]()


def get_preview_dataframe(scenario_title: str, variant_name: str):
    import io
    csv_bytes = get_dataset(scenario_title, variant_name)
    return pd.read_csv(io.BytesIO(csv_bytes))
