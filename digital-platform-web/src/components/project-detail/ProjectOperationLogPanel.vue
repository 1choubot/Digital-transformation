<template>
  <section class="panel operation-log-panel">
    <div class="panel-heading">
      <div>
        <span class="section-eyebrow">业务日志</span>
        <h3>项目业务操作记录</h3>
        <p class="manual-status-note">
          业务日志只记录本平台内已登录用户触发的关键业务状态变化，不包含登录日志、文件平台日志或系统配置日志。
        </p>
      </div>
    </div>

    <section v-if="loading" class="state-panel state-panel--inline">
      <p>正在加载业务日志...</p>
    </section>

    <section v-else-if="errorMessage" class="state-panel state-panel--inline state-panel--error">
      <h3>业务日志加载失败</h3>
      <p>{{ errorMessage }}</p>
    </section>

    <section v-else-if="logs.length === 0" class="state-panel state-panel--inline">
      <p>暂无业务日志。</p>
    </section>

    <ol v-else class="operation-log-list">
      <li v-for="log in logs" :key="log.id" class="operation-log-item">
        <div class="operation-log-item__meta">
          <time>{{ formatDateTime(log.createdAt) }}</time>
          <span>{{ formatOperationActor(log) }}</span>
          <span>{{ formatOperationAction(log.actionType) }}</span>
        </div>
        <strong>{{ log.summary || formatOperationAction(log.actionType) }}</strong>
        <span class="mono">{{ log.actionType }}</span>
      </li>
    </ol>
  </section>
</template>

<script setup>
import { formatDateTime } from '../../utils/format.js';
import { formatOperationAction, formatOperationActor } from './stageDocumentViewHelpers.js';

defineProps({
  loading: {
    type: Boolean,
    default: false
  },
  errorMessage: {
    type: String,
    default: ''
  },
  logs: {
    type: Array,
    default: () => []
  }
});
</script>
