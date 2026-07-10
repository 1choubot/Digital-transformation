<template><SolutionDesignNodePageShell v-bind="$props" node-key="customer_solution_review" @business-state-changed="emit('business-state-changed', $event)" /></template>
<script setup>
import SolutionDesignNodePageShell from './SolutionDesignNodePageShell.vue';
import { solutionDesignNodePageProps } from './solutionDesignNodePageProps.js';
const emit = defineEmits(['business-state-changed']);
defineProps(solutionDesignNodePageProps);
</script>
