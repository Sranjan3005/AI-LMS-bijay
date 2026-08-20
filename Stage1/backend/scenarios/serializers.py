from rest_framework import serializers
from .models import Scenario, DataVariant


class DataVariantSerializer(serializers.ModelSerializer):
    is_custom = serializers.SerializerMethodField()

    class Meta:
        model  = DataVariant
        fields = ['id', 'name', 'label', 'description', 'watch_for', 'order', 'is_custom']

    def get_is_custom(self, obj):
        return obj.user is not None


class ScenarioListSerializer(serializers.ModelSerializer):
    """Compact representation used in the scenario grid / card view."""
    variant_count = serializers.IntegerField(source='variants.count', read_only=True)
    variants = DataVariantSerializer(many=True, read_only=True)

    class Meta:
        model  = Scenario
        # The lab only fetches the list endpoint, so it must carry the full
        # authored narrative layer (story/data_story/outcome_guide/guide_steps).
        fields = ['id', 'title', 'model_type', 'challenge', 'takeaway', 'try_it_out',
                  'story', 'data_story', 'outcome_guide', 'guide_steps', 'grade_band',
                  'icon', 'order', 'variant_count', 'variants']


class ScenarioDetailSerializer(serializers.ModelSerializer):
    """Full representation including all variants — used in the workbench."""
    variants = DataVariantSerializer(many=True, read_only=True)

    class Meta:
        model  = Scenario
        fields = ['id', 'title', 'model_type', 'challenge', 'takeaway', 'try_it_out',
                  'story', 'data_story', 'outcome_guide', 'guide_steps', 'grade_band',
                  'icon', 'order', 'variants']
