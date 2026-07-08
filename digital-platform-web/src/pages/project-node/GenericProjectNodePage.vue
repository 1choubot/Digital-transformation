<template>
  <section class="state-panel state-panel--inline">
    <h3>{{ node?.nodeName || node?.name || '项目节点' }}</h3>
    <p>该节点使用通用项目工作区产出面板展示；后续可按节点编码替换为专用页面。</p>
  </section>
</template>

<script setup>
defineProps({
  node: {
    type: Object,
    default: null
  }
});
</script>
