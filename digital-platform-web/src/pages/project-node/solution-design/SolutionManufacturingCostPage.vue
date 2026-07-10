<template><SolutionDesignNodePageShell v-bind="$props" node-key="manufacturing_cost_estimation" @business-state-changed="emit('business-state-changed', $event)" /></template>
<script setup>
import SolutionDesignNodePageShell from './SolutionDesignNodePageShell.vue';
import { solutionDesignNodePageProps } from './solutionDesignNodePageProps.js';
const emit = defineEmits(['business-state-changed']);
defineProps(solutionDesignNodePageProps);
</script>
