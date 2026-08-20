from computer_vision.models import CVExperiment
exp = CVExperiment.objects.last()
if exp:
    print('Generated Code:\n', exp.generated_code)
    print('STDOUT:\n', exp.stdout_log)
    print('STDERR:\n', exp.stderr_log)
    print('Stage Images Length:', len(exp.stage_images))
    print('Status:', exp.status)
else:
    print('No experiments found.')
