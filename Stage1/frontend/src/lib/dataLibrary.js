/**
 * dataLibrary.js — the catalogue behind the global Data Library panel.
 *
 * Students never have to invent (or go and collect) input data: they open the
 * panel from anywhere in the app and drag a ready-made dataset onto the agentic
 * canvas, which turns it into a pre-filled node.
 *
 * Delivery is deliberately split:
 *   • text datasets are inlined here — they are a few KB, so they are instant
 *     and can never 404.
 *   • image datasets are referenced by URL under /datasets/ (the files already
 *     ship in public/). The drag carries the URL; AgenticWorkspace fetches and
 *     converts it to a base64 data URL on drop, because that is what the
 *     backend node factories read (see compiler.py: node_data['fileBase64']).
 * Inlining the images instead would put several MB of base64 into the JS bundle
 * for every page load, which is not worth it.
 */

import { loadManifest } from './datasets';

export const DATASET_DRAG_TYPE = 'application/reactflow-dataset';

/* ── Text datasets (inlined) ─────────────────────────────────────────────── */

const CLASS_REGISTER = `CLASS REGISTER — Grade 8B, Sutra Public School
Class teacher: Mrs. R. Menon   |   Session: 2026-27

roll,name,appearance,guardian_phone
12,Aarav Sharma,round glasses / red collared shirt / short black hair,+91 98xxx 11002
13,Diya Patel,long braided hair / blue kurta / silver hoop earrings,+91 98xxx 11003
14,Kabir Nair,curly hair / green hoodie / no glasses,+91 98xxx 11004
15,Meera Iyer,short bob haircut / yellow top / thick square glasses,+91 98xxx 11005
16,Rohan Das,buzz cut / orange t-shirt / blue wristband,+91 98xxx 11006
17,Ananya Rao,ponytail / purple sweater / small stud earrings,+91 98xxx 11007

Attendance rule: a student is marked PRESENT only if they are matched to exactly
one register row. If no row matches, mark UNKNOWN VISITOR and notify the office.`;

const RESTAURANT_RECORDS = `RESTAURANT INTERNAL RECORDS — CAFE CHITI

Menu:
- Spicy Chicken Sandwich: $8.50
- Vegan Burger: $9.00
- Cold Brew Coffee: $4.00
- Fries: $3.00

Policies:
- Wait times average 15 minutes during lunch rush (12pm-2pm).
- We do not accept reservations.
- Refund policy: Full refund if the food is cold or incorrect.

Staff on duty (last 7 days):
- Manager: Sarah
- Server: Alex, Jamie`;

const CUSTOMER_REVIEWS = `Review 1 (Good):
"Had the Vegan Burger and it was amazing! Server Alex was super friendly. Highly recommend."

Review 2 (Bad - factually wrong):
"Waited 45 minutes for a Spicy Chicken Sandwich that cost $15! Outrageous prices and slow service."

Review 3 (Bad - needs management):
"Found a piece of plastic in my fries. I asked for a refund and the manager Sarah ignored me. Unacceptable hygiene and service!"`;

const CAFETERIA_FEEDBACK = `CAFETERIA FEEDBACK FORMS — collected week of 12 March

Form 01: "The rajma chawal was great but the queue took 20 minutes. Please add a second counter."
Form 02: "Food is fine. The tables were sticky and nobody wiped them between lunch slots."
Form 03: "Loved the new fruit bowl option! Much better than the fried snacks."
Form 04: "Too expensive. 60 rupees for a small sandwich is a lot for a school canteen."
Form 05: "The queue is the worst part. By the time I get food, break is almost over."
Form 06: "Staff are polite and friendly. The aunty at the counter always remembers my order."
Form 07: "There is never anything for people who don't eat spicy food."
Form 08: "Please bring back the Friday pasta. Everyone misses it."
Form 09: "Hygiene has improved a lot this term, the counter looks clean now."
Form 10: "Portions are small for the price, I am still hungry after lunch."`;

const NEWS_ARTICLE_FAKE = `SCIENTISTS CONFIRM: Drinking 3 Litres of Cold Water Daily Boosts IQ by 40 Points

In a groundbreaking study that mainstream media REFUSES to cover, researchers at
the International Institute of Brain Science have proven that drinking exactly
three litres of chilled water every morning increases measured IQ by up to 40
points within two weeks. "The results shocked us," said lead researcher Dr. A.
Kumar. The study, which has not yet been published in any journal, followed 12
participants. Schools across Europe are already making the practice mandatory.
Share this before it gets taken down!`;

const NEWS_ARTICLE_REAL = `Monsoon Arrives Over Kerala Coast, Two Days Ahead of Forecast

The India Meteorological Department announced on Tuesday that the southwest
monsoon reached the Kerala coast on 29 May, two days earlier than its own
forecast of 31 May. IMD Director General Mrutyunjay Mohapatra said the onset was
confirmed after 14 designated weather stations recorded sustained rainfall above
2.5 mm for two consecutive days, alongside the required wind-field and outgoing
longwave radiation criteria. Farmers in the region have been advised to begin
sowing preparations. The department maintains its seasonal forecast of rainfall
at 96-104% of the long-period average.`;

const LIBRARY_LOANS = `SCHOOL LIBRARY — OVERDUE LOANS (as of 29 July)

book_id,title,borrower_roll,borrower_name,due_date,days_overdue
B-1042,A Brief History of Time,14,Kabir Nair,2026-07-10,19
B-0885,The Hobbit,12,Aarav Sharma,2026-07-18,11
B-1190,Indian Polity,17,Ananya Rao,2026-07-22,7
B-0301,Wings of Fire,13,Diya Patel,2026-07-25,4
B-1455,Cosmos,16,Rohan Das,2026-07-28,1`;

/* ── Catalogue ───────────────────────────────────────────────────────────── */

/**
 * kind:
 *   'text'     → inline string, becomes a Text Input or Document Reader node
 *   'image'    → a single file under /datasets/, becomes a Vision Scanner node
 *   'imageset' → a manifest folder; the panel previews it and each image can be
 *                dragged out individually
 */
export const DATASETS = [
  /* Classroom & school */
  {
    id: 'class-register',
    category: 'Classroom & school',
    name: 'Class Register (Grade 8B)',
    blurb: 'Roll numbers, names and how each student looks — the lookup table behind the Auto-Attendance pipeline.',
    kind: 'text',
    nodeType: 'documentReader',
    nodeLabel: 'Class Register',
    text: CLASS_REGISTER,
    facts: ['6 students', '4 columns', 'CSV inside a text header'],
  },
  {
    id: 'register-sheet',
    category: 'Classroom & school',
    name: 'Register Sheet (with photos)',
    blurb: 'The same register as a photographed sheet — each row carries the student’s picture, so a vision model can match a face to a name.',
    kind: 'image',
    nodeType: 'visionScanner',
    nodeLabel: 'Class Register (photos)',
    url: 'attendance/register_sheet.png',
    facts: ['6 rows with portraits', 'Roll no + name + photo', 'Feeds the Vision Scanner'],
  },
  {
    id: 'arrival-photos',
    category: 'Classroom & school',
    name: 'Students Arriving (door camera)',
    blurb: 'Single-student snapshots as they walk into class. Drag one in as the live camera frame.',
    kind: 'imageset',
    nodeType: 'visionScanner',
    nodeLabel: 'Door Camera',
    folder: 'attendance/arrivals',
    facts: ['6 snapshots', 'One student per frame', 'Matches a register row'],
  },
  {
    id: 'cafeteria-feedback',
    category: 'Classroom & school',
    name: 'Cafeteria Feedback Forms',
    blurb: 'Ten handwritten-style feedback forms from the school canteen — queues, prices, hygiene, portions.',
    kind: 'text',
    nodeType: 'documentReader',
    nodeLabel: 'Feedback Forms',
    text: CAFETERIA_FEEDBACK,
    facts: ['10 forms', 'Mixed sentiment', 'Good for Summarizer → Sentiment'],
  },
  {
    id: 'library-loans',
    category: 'Classroom & school',
    name: 'Library Overdue Loans',
    blurb: 'Five overdue books with borrower and days late — a clean little table for reminder pipelines.',
    kind: 'text',
    nodeType: 'documentReader',
    nodeLabel: 'Overdue Loans',
    text: LIBRARY_LOANS,
    facts: ['5 rows', '6 columns', 'Joins to the class register on roll'],
  },

  /* Business records */
  {
    id: 'restaurant-records',
    category: 'Business records',
    name: 'Restaurant Internal Records',
    blurb: 'Cafe Chiti’s real menu prices, wait times, refund policy and staff roster — the ground truth a reply bot fact-checks against.',
    kind: 'text',
    nodeType: 'documentReader',
    nodeLabel: 'Internal Records',
    text: RESTAURANT_RECORDS,
    facts: ['4 menu items', 'Policies + staff roster', 'Contradicts review 2 on purpose'],
  },
  {
    id: 'customer-reviews',
    category: 'Business records',
    name: 'Customer Reviews (3 samples)',
    blurb: 'One happy review, one factually wrong review, and one that genuinely needs a manager. Designed to exercise every branch.',
    kind: 'text',
    nodeType: 'textInput',
    nodeLabel: 'Customer Review',
    text: CUSTOMER_REVIEWS,
    facts: ['3 reviews', '1 positive / 2 negative', '1 needs escalation'],
  },

  /* Text to analyse */
  {
    id: 'article-fake',
    category: 'News & text',
    name: 'Suspicious Article',
    blurb: 'Unpublished study, 12 participants, miracle claim, "share before it gets taken down". Every fake-news tell in one page.',
    kind: 'text',
    nodeType: 'textInput',
    nodeLabel: 'Article Text',
    text: NEWS_ARTICLE_FAKE,
    facts: ['~90 words', 'No named journal', 'Urgency + conspiracy framing'],
  },
  {
    id: 'article-real',
    category: 'News & text',
    name: 'Genuine News Report',
    blurb: 'A real-style IMD monsoon report: named official, specific criteria, checkable numbers. The control case.',
    kind: 'text',
    nodeType: 'textInput',
    nodeLabel: 'Article Text',
    text: NEWS_ARTICLE_REAL,
    facts: ['~110 words', 'Named source + date', 'Falsifiable specifics'],
  },

  /* Computer vision image sets */
  {
    id: 'handwriting-clean',
    category: 'Computer vision',
    name: 'Handwriting — clean',
    blurb: 'Neat, well-spaced handwriting. What OCR engines are happiest with.',
    kind: 'imageset',
    nodeType: 'visionScanner',
    nodeLabel: 'Clean Handwriting',
    folder: 'handwriting/clean',
    facts: ['Even baseline', 'Separated letters', 'High contrast'],
  },
  {
    id: 'handwriting-messy',
    category: 'Computer vision',
    name: 'Handwriting — messy',
    blurb: 'Joined-up, slanted, uneven writing. The hard case that breaks naive segmentation.',
    kind: 'imageset',
    nodeType: 'visionScanner',
    nodeLabel: 'Messy Handwriting',
    folder: 'handwriting/messy',
    facts: ['Connected strokes', 'Varying slant', 'Hard to segment'],
  },
  {
    id: 'handwriting-noisy',
    category: 'Computer vision',
    name: 'Handwriting — noisy',
    blurb: 'Faded, smudged, low-contrast scans. Tests whether preprocessing is doing its job.',
    kind: 'imageset',
    nodeType: 'visionScanner',
    nodeLabel: 'Noisy Handwriting',
    folder: 'handwriting/noisy',
    facts: ['Low contrast', 'Speckle + smudging', 'Thresholding matters'],
  },
  {
    id: 'wildlife-endangered',
    category: 'Computer vision',
    name: 'Wildlife — endangered',
    blurb: 'Tigers and Asian elephants photographed in the wild. The species the rescue drone must flag.',
    kind: 'imageset',
    nodeType: 'visionScanner',
    nodeLabel: 'Drone Photo',
    folder: 'wildlife/endangered',
    facts: ['4 photos', 'Tiger + Asian elephant', 'CC BY-SA, see ATTRIBUTIONS.md'],
  },
  {
    id: 'wildlife-common',
    category: 'Computer vision',
    name: 'Wildlife — common',
    blurb: 'Everyday animals. The drone should recognise these and take no action.',
    kind: 'imageset',
    nodeType: 'visionScanner',
    nodeLabel: 'Drone Photo',
    folder: 'wildlife/common',
    facts: ['2 photos', 'Non-endangered', 'Should NOT alert rangers'],
  },
  {
    id: 'mushroom-poison',
    category: 'Computer vision',
    name: 'Mushrooms — poisonous',
    blurb: 'Red and brown poisonous species. Note that colour alone does not predict danger.',
    kind: 'imageset',
    nodeType: 'visionScanner',
    nodeLabel: 'Mushroom Photo',
    folder: 'mushroom/red_poison',
    facts: ['4 photos', 'Amanita muscaria and others', 'Colour ≠ safety'],
  },
  {
    id: 'mushroom-safe',
    category: 'Computer vision',
    name: 'Mushrooms — edible',
    blurb: 'Safe species, including red ones — the counter-examples that break the "red = danger" shortcut.',
    kind: 'imageset',
    nodeType: 'visionScanner',
    nodeLabel: 'Mushroom Photo',
    folder: 'mushroom/red_safe',
    facts: ['4 photos', 'Edible despite red caps', 'Breaks the colour shortcut'],
  },
  {
    id: 'trash-good',
    category: 'Computer vision',
    name: 'Recycling — good data',
    blurb: 'Sharp, well-lit, one item, plain background. What clean training data looks like.',
    kind: 'imageset',
    nodeType: 'visionScanner',
    nodeLabel: 'Waste Photo',
    folder: 'trash/good',
    facts: ['5 photos', 'Single item, plain background', 'The studio-shot ideal'],
  },
  {
    id: 'trash-bad',
    category: 'Computer vision',
    name: 'Recycling — bad data',
    blurb: 'Blurry, dark, cluttered piles. Same objects, very different data quality.',
    kind: 'imageset',
    nodeType: 'visionScanner',
    nodeLabel: 'Waste Photo',
    folder: 'trash/bad',
    facts: ['5 photos', 'Cluttered + low light', 'Where models fall apart'],
  },
  {
    id: 'road-signs',
    category: 'Computer vision',
    name: 'Road Signs',
    blurb: 'Standard traffic signs as clean vector renders — the easy end of the self-driving problem.',
    kind: 'imageset',
    nodeType: 'visionScanner',
    nodeLabel: 'Road Sign',
    folder: 'signs',
    facts: ['5 signs', 'Public domain', 'High contrast, fixed shapes'],
  },
  {
    id: 'edge-shapes',
    category: 'Computer vision',
    name: 'Edge-detection Samples',
    blurb: 'Photos with strong outlines — ideal input for showing what a Sobel filter actually responds to.',
    kind: 'imageset',
    nodeType: 'visionScanner',
    nodeLabel: 'Edge Sample',
    folder: 'edge',
    facts: ['3 photos', 'Strong boundaries', 'No training required'],
  },
];

export const CATEGORIES = [...new Set(DATASETS.map((d) => d.category))];

export const assetUrl = (rel) => `/datasets/${rel}`;

/** Expand an 'imageset' dataset to its individual image paths via the manifest. */
export async function imagesFor(dataset) {
  if (dataset.kind === 'image') return [dataset.url];
  if (dataset.kind !== 'imageset') return [];
  const manifest = await loadManifest();
  return manifest[dataset.folder] || [];
}

/**
 * The payload written onto a drag. Kept small and JSON-serialisable — the
 * canvas reads it back in onDrop and builds the matching node.
 */
export function dragPayload(dataset, imageRel = null) {
  return JSON.stringify({
    datasetId: dataset.id,
    nodeType: dataset.nodeType,
    label: dataset.nodeLabel || dataset.name,
    text: dataset.kind === 'text' ? dataset.text : undefined,
    url: imageRel ? assetUrl(imageRel) : dataset.url ? assetUrl(dataset.url) : undefined,
    fileName: imageRel ? imageRel.split('/').pop() : undefined,
  });
}

/** Fetch an image URL and return a base64 data URL — what the node factories read. */
export async function urlToDataUrl(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load ${url} (${res.status})`);
  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
