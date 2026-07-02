<template>
  <section class="panel placeholder-panel">
    <div class="panel-heading">
      <h3>{{ nodeName }}</h3>
      <p>节点内容待开发</p>
    </div>
  </section>
</template>

<script setup>
defineProps({
  nodeName: { type: String, required: true }
});
</script>
