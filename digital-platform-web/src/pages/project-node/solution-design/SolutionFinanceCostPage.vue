<template>
    <StandardSolutionNodePage v-bind="$props" @business-state-changed="$emit('business-state-changed', $event)" />
</template>
<script
    setup>    import StandardSolutionNodePage from '../../../components/project-workspace/solution-design/StandardSolutionNodePage.vue'; import { solutionDesignNodePageProps } from '../../../composables/project-stage/solution-design/useSolutionDesignNodePage.js'; defineEmits(['business-state-changed']); defineProps(solutionDesignNodePageProps);</script>
