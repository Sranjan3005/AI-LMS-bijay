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
    ('regression', 'Explain a best-fit line',
     'In your own words, explain why a best-fit line helps us predict a number. Give one real example (like ice-cream sales or plant growth).',
     'Full marks for a clear, correct explanation in the student\'s own words plus a sensible real-world example. Partial marks for a correct idea with a weak example.'),
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
