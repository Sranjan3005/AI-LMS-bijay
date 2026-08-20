"""
Seed global Sutra assignment templates (school=None) so school admins have
grade 6-8 content to hand out. Idempotent: re-running updates by (module_key, title).

    python manage.py seed_assignments
"""

from django.core.management.base import BaseCommand

from assignments.models import Assignment


QUIZZES = [
    ('foundations', 'AI Basics — Quick Check', [
        {'q': 'What makes something "AI" rather than an ordinary program?',
         'options': ['It is very fast', 'It learns patterns from examples', 'It uses the internet', 'It has a screen'], 'answer': 1},
        {'q': 'Which is an example of AI learning, not just following fixed rules?',
         'options': ['A calculator adding numbers', 'A spam filter that improves as it sees more emails', 'A light switch', 'A clock'], 'answer': 1},
        {'q': 'Supervised learning means the computer learns from…',
         'options': ['Labelled examples', 'No data at all', 'Random guesses only', 'The weather'], 'answer': 0},
    ]),
    ('data', 'Working with Data — Quick Check', [
        {'q': 'In a table of data, a "feature" is…',
         'options': ['The answer we want to predict', 'One piece of information about each example', 'A type of chart', 'A broken sensor'], 'answer': 1},
        {'q': 'Why can biased data be a problem?',
         'options': ['It is too colourful', 'The model can learn something unfair or wrong', 'It loads slowly', 'It uses more memory'], 'answer': 1},
        {'q': 'Which chart is best for showing a trend over time?',
         'options': ['Pie chart', 'Line graph', 'A single number', 'A photo'], 'answer': 1},
    ]),
    ('regression', 'Linear Regression — Quick Check', [
        {'q': 'Regression is used to predict…',
         'options': ['A category (cat or dog)', 'A number (like price or temperature)', 'A password', 'A colour name'], 'answer': 1},
        {'q': 'The "best-fit line" is the line that…',
         'options': ['Is the most colourful', 'Passes through zero', 'Is closest to all the data points', 'Is always flat'], 'answer': 2},
        {'q': 'If a model predicts lemonade sales from temperature, what happens on a free-lemonade day?',
         'options': ['Temperature still explains sales perfectly', 'Sales may spike for a reason the model cannot see', 'Nothing changes', 'The model becomes 100% accurate'], 'answer': 1},
    ]),
    ('classification', 'Classification — Quick Check', [
        {'q': 'A classifier predicts…',
         'options': ['A number', 'A label / category', 'A drawing', 'A song'], 'answer': 1},
        {'q': 'A "decision boundary" is…',
         'options': ['The edge of the screen', 'The line that separates the categories', 'A type of data', 'A password'], 'answer': 1},
        {'q': 'If 95% of messages are safe, a model that always says "safe" will…',
         'options': ['Be useless for catching spam despite high accuracy', 'Be the best model', 'Never make mistakes', 'Predict numbers'], 'answer': 0},
    ]),
    ('neural', 'Neural Networks — Quick Check', [
        {'q': 'In a neuron, the "weights" decide…',
         'options': ['The colour', 'How much each input matters', 'The screen size', 'The internet speed'], 'answer': 1},
        {'q': 'What does "training" a network mean?',
         'options': ['Turning it off and on', 'Nudging the weights to reduce mistakes', 'Painting it', 'Adding more screens'], 'answer': 1},
        {'q': 'Why use layers of neurons?',
         'options': ['To use more electricity', 'To build complex ideas from simple ones', 'To slow it down', 'For decoration'], 'answer': 1},
    ]),
    ('vision', 'Computer Vision — Quick Check', [
        {'q': 'To a computer, an image is really…',
         'options': ['A song', 'A grid of numbers (pixels)', 'A single word', 'A smell'], 'answer': 1},
        {'q': 'Edge detection helps a model by…',
         'options': ['Making the image bigger', 'Finding the outlines/shapes in a picture', 'Adding colour', 'Deleting the image'], 'answer': 1},
        {'q': 'Object detection does what?',
         'options': ['Finds and labels things in an image with boxes', 'Plays a video', 'Writes an essay', 'Predicts the weather'], 'answer': 0},
    ]),
    ('agentic', 'AI Agents — Quick Check', [
        {'q': 'How is an AI agent different from a plain chatbot?',
         'options': ['It is smaller', 'It plans steps and can use tools', 'It has no text', 'It cannot answer'], 'answer': 1},
        {'q': 'In the studio, a "node" is…',
         'options': ['A block that does one job in the flow', 'A type of error', 'A password', 'A colour'], 'answer': 0},
        {'q': 'A "decider" node lets the flow…',
         'options': ['Change colour', 'Branch or loop based on the result', 'Turn off', 'Play music'], 'answer': 1},
    ]),
    ('ethics', 'Responsible AI — Quick Check', [
        {'q': 'Where does AI bias usually come from?',
         'options': ['The colour of the app', 'Unfair or skewed data', 'Fast internet', 'Big screens'], 'answer': 1},
        {'q': '"Privacy" in AI is mainly about…',
         'options': ['How fast it runs', 'Whose data is used and whether they agreed', 'The font', 'The price'], 'answer': 1},
        {'q': 'Who should be accountable when an AI makes an important mistake?',
         'options': ['Nobody', 'A person who can explain and fix it', 'The screen', 'The internet'], 'answer': 1},
    ]),
]

TASKS = [
    ('foundations', 'AI or not AI?',
     'Pick two apps or gadgets you use (a video app, a game, a voice assistant, a calculator…). For each one, say whether it uses AI and explain how you can tell. Then describe one thing you wish an AI could do for you at school.',
     'Full marks for two sensible examples correctly judged as AI / not-AI with a reason that shows understanding (AI learns from examples/data rather than only fixed rules), plus a thoughtful wish. Partial marks for one good example or a weak reason.'),
    ('data', 'Clean a messy dataset',
     'Imagine a small table of students with columns Name, Age, Marks. Some rows have a missing mark, an impossible age (like 200), or are exact duplicates. Describe, step by step, how you would clean this data, and explain why each fix matters BEFORE an AI learns from it.',
     'Reward identifying the three problems (missing values, impossible/outlier values, duplicates), a sensible fix for each (fill/remove, correct/drop, deduplicate), and a clear reason that connects clean data to a fair, accurate model ("garbage in, garbage out"). Partial marks for handling some issues.'),
    ('regression', 'Explain a best-fit line',
     'In your own words, explain why a best-fit line helps us predict a number. Give one real example (like ice-cream sales or plant growth).',
     'Full marks for a clear, correct explanation in the student\'s own words plus a sensible real-world example. Partial marks for a correct idea with a weak example.'),
    ('classification', 'Design your own classifier',
     'Think of something you would like an AI to sort into groups (is an email spam or not? is a photo a dog or a cat? is a message kind or mean?). Describe what examples you would collect, which features matter, and one way you would check whether your classifier is fair.',
     'Reward a clear problem with two or more real categories, sensible features, an understanding that the model learns from labelled examples, and a fairness check (balanced data, testing on different groups). Partial marks for a correct idea missing the fairness reflection.'),
    ('neural', 'Explain a neural network to a friend',
     'In your own words, explain how a neural network learns, using a simple everyday comparison (like a team practising, or learning to ride a bicycle). Mention what "weights" are and what happens when the network makes a mistake.',
     'Full marks for a correct learning-by-practice analogy, a sensible description of weights (how much each input matters), and the idea that mistakes nudge the weights so next time is better. Partial marks for a good analogy that misses weights or the correction step.'),
    ('vision', 'How does a machine see?',
     'Explain how a photo becomes numbers that a computer can understand. Then describe one real use of computer vision in India (like FASTag number-plate reading, or a crop-disease app). What could go wrong if all the training images looked very similar?',
     'Reward the pixel-grid idea (an image is a grid of numbers), a real Indian example of computer vision, and recognising that unvaried training data makes a model fail on new/different images (poor generalisation, bias). Partial marks for two of the three.'),
    ('agentic', 'Build a fake-news detective agent',
     'Open the Agent Studio and BUILD a working agent pipeline that fights fake news. It should: take a news article as input, check how positive or negative it sounds, search the web to verify its claims, combine those results, and show a final verdict on whether the article might be fake. Drag in the right nodes, connect them in a sensible order, test your pipeline, then submit it for evaluation.',
     'Reward a pipeline that has an INPUT node (e.g. Text Input), at least one ANALYSIS step (Sentiment Analyzer) and a VERIFY step (Web Search), a way to COMBINE results (Merger) or decide, and an OUTPUT/Display node — all connected in a logical order from input to output. Full marks for a complete, sensibly-wired flow; partial marks for a good attempt missing one piece or a connection.'),
    ('ethics', 'Spot the unfairness',
     'Describe one real situation where an AI could be unfair to some people, explain why it happens, and suggest one way to make it fairer.',
     'Reward a plausible real example, a correct cause (usually biased data), and a sensible fix. Encourage empathy and clear reasoning.'),
]


class Command(BaseCommand):
    help = 'Seed global grade 6-8 assignment templates (quizzes + LLM-graded tasks).'

    def handle(self, *args, **options):
        created = updated = 0

        for module_key, title, questions in QUIZZES:
            obj, was_created = Assignment.objects.update_or_create(
                module_key=module_key, title=title, school=None,
                defaults={'kind': 'quiz', 'questions': questions, 'points': 100,
                          'is_template': True, 'is_published': True,
                          'description': 'A quick check on what you learned in this module.'},
            )
            created += was_created
            updated += (not was_created)

        for module_key, title, description, rubric in TASKS:
            obj, was_created = Assignment.objects.update_or_create(
                module_key=module_key, title=title, school=None,
                defaults={'kind': 'task', 'description': description, 'rubric': rubric,
                          'points': 100, 'is_template': True, 'is_published': True},
            )
            created += was_created
            updated += (not was_created)

        self.stdout.write(self.style.SUCCESS(
            f'Seeded assignments: {created} created, {updated} updated '
            f'({len(QUIZZES)} quizzes + {len(TASKS)} tasks).'))
