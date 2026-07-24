<template>
  <DetailedDesignReviewNodePage
    v-bind="$props"
    @business-state-changed="$emit('business-state-changed', $event)"
  />
</template>

<script setup>
import DetailedDesignReviewNodePage from '../../../components/project-workspace/detailed-design/DetailedDesignReviewNodePage.vue';
import { detailedDesignNodePageProps } from '../../../composables/project-stage/detailed-design/useDetailedDesignNodePage.js';

defineEmits(['business-state-changed']);
defineProps(detailedDesignNodePageProps);
</script>
