<template>
    <SolutionReviewNodePage v-bind="$props" @business-state-changed="$emit('business-state-changed', $event)" />
</template>
<script
    setup>    import SolutionReviewNodePage from '../../../components/project-workspace/solution-design/SolutionReviewNodePage.vue'; import { solutionDesignNodePageProps } from '../../../composables/project-stage/solution-design/useSolutionDesignNodePage.js'; defineEmits(['business-state-changed']); defineProps(solutionDesignNodePageProps);</script>
