<template>
  <section class="panel">
    <div class="panel-heading">
      <span class="section-eyebrow">阶段状态</span>
      <h3>标准 8 阶段</h3>
    </div>
    <StageStepper :stages="stages" />
  </section>
</template>

<script setup>
import StageStepper from '../StageStepper.vue';

defineProps({
  stages: {
    type: Array,
    default: () => []
  }
});
</script>
