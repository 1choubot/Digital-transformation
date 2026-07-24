<template>
  <DetailedDesignUploadNodePage
    v-bind="$props"
    @business-state-changed="$emit('business-state-changed', $event)"
  />
</template>

<script setup>
import DetailedDesignUploadNodePage from '../../../components/project-workspace/detailed-design/DetailedDesignUploadNodePage.vue';
import { detailedDesignNodePageProps } from '../../../composables/project-stage/detailed-design/useDetailedDesignNodePage.js';

defineEmits(['business-state-changed']);
defineProps(detailedDesignNodePageProps);
</script>
