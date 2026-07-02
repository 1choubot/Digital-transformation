<template>
  <section class="panel project-info-panel">
    <div class="panel-heading">
      <div>
        <span class="section-eyebrow">项目输入</span>
        <h3>{{ projectName }}</h3>
        <p>项目输入节点展示轻量项目基础信息，不新增资料产出。</p>
      </div>
    </div>
    <div class="project-input-detail">
      <dl>
        <dt>项目编号</dt>
        <dd>{{ projectCode }}</dd>
      </dl>
      <dl>
        <dt>项目名称</dt>
        <dd>{{ projectName }}</dd>
      </dl>
      <dl>
        <dt>当前阶段</dt>
        <dd>{{ currentStageTitle }}</dd>
      </dl>
      <dl>
        <dt>项目状态</dt>
        <dd>{{ projectStatus }}</dd>
      </dl>
    </div>
  </section>
</template>

<script setup>
defineProps({
  projectName: { type: String, required: true },
  projectCode: { type: String, default: '' },
  currentStageTitle: { type: String, default: '-' },
  projectStatus: { type: String, default: '' }
});
</script>
