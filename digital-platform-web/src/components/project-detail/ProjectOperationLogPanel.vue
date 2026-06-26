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

<style scoped>
/* ===== 卡片容器 ===== */
.operation-log-panel {
  background: #ffffff;
  border-radius: 8px;
  border: none;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.04);
  overflow: hidden;
  transition: box-shadow 0.2s ease;
}

.operation-log-panel:hover {
  box-shadow: 0 8px 20px rgba(0, 21, 41, 0.06);
}

/* ===== 面板头部 ===== */
.panel-heading {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #ebeef5;
}

.section-eyebrow {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #909399;
  margin-bottom: 0.25rem;
}

.panel-heading h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #303133;
  margin: 0 0 0.25rem 0;
  position: relative;
  padding-left: 10px;
}

.panel-heading h3::before {
  content: '';
  position: absolute;
  left: 0;
  top: 2px;
  bottom: 2px;
  width: 4px;
  background: #3e63dd;
  border-radius: 2px;
}

.manual-status-note {
  font-size: 0.8rem;
  color: #909399;
  margin: 0.25rem 0 0 0;
  line-height: 1.4;
}

/* ===== 状态面板（加载/错误/空） ===== */
.state-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
  text-align: center;
}

.state-panel--inline {
  padding: 2rem 1.5rem;
}

.state-panel h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #303133;
  margin: 0 0 0.5rem 0;
}

.state-panel p {
  font-size: 0.9rem;
  color: #909399;
  margin: 0;
}

.state-panel--error {
  background: #fef0f0;
  border-radius: 8px;
  margin: 0 1.5rem 1.5rem;
  padding: 2rem;
}

.state-panel--error h3 {
  color: #f56c6c;
}

/* ===== 日志列表 ===== */
.operation-log-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

/* ===== 每个日志条目（网格布局） ===== */
.operation-log-item {
  display: grid;
  grid-template-columns: 140px 120px 100px 1fr 90px;
  align-items: center;
  gap: 0.5rem 1rem;
  padding: 0.7rem 1.5rem;
  border-bottom: 1px solid #f0f0f0;
  font-size: 0.85rem;
  color: #606266;
  transition: background 0.15s ease;
}

.operation-log-item:hover {
  background: #f8fafc;
}

.operation-log-item:last-child {
  border-bottom: none;
}

/* 让 meta 内的子元素直接参与网格 */
.operation-log-item__meta {
  display: contents;
}

/* 网格子元素通用样式 */
.operation-log-item time,
.operation-log-item__meta span,
.operation-log-item strong,
.operation-log-item .mono {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 时间 */
.operation-log-item time {
  font-size: 0.8rem;
  color: #909399;
  font-family: Consolas, monospace;
}

/* 操作人 */
.operation-log-item__meta span:nth-of-type(1) {
  font-weight: 500;
  color: #303133;
}

/* 动作类型（可读） */
.operation-log-item__meta span:nth-of-type(2) {
  background: #f4f4f5;
  border-radius: 4px;
  padding: 0.1rem 0.5rem;
  font-size: 0.75rem;
  color: #606266;
  white-space: nowrap;
}

/* 摘要 */
.operation-log-item strong {
  font-weight: 500;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 动作类型代码（mono） */
.operation-log-item .mono {
  font-family: Consolas, monospace;
  font-size: 0.7rem;
  color: #909399;
  background: #f4f6f9;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 0.05rem 0.4rem;
  text-align: center;
  white-space: nowrap;
}

/* ============================================================ */
/* ===== 响应式：与主应用断点对齐 ===== */
/* ============================================================ */

/* 1024px 以下：隐藏动作类型代码，压缩列 */
@media (max-width: 1024px) {
  .operation-log-item {
    grid-template-columns: 130px 110px 90px 1fr;
  }
  .operation-log-item .mono {
    display: none;
  }
}

/* 768px 以下：变为卡片堆叠布局 */
@media (max-width: 768px) {
  .panel-heading {
    padding: 0.85rem 1rem;
  }

  .operation-log-item {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.25rem;
    padding: 0.75rem 1rem;
  }

  .operation-log-item__meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem 0.75rem;
  }

  .operation-log-item time {
    font-size: 0.75rem;
  }

  .operation-log-item__meta span:nth-of-type(1) {
    font-size: 0.85rem;
  }

  .operation-log-item__meta span:nth-of-type(2) {
    font-size: 0.7rem;
    padding: 0.05rem 0.4rem;
  }

  .operation-log-item strong {
    font-size: 0.9rem;
    white-space: normal;
    word-break: break-word;
  }

  .operation-log-item .mono {
    display: inline-block;
    align-self: flex-start;
    font-size: 0.65rem;
    padding: 0.05rem 0.4rem;
  }

  .state-panel--error {
    margin: 0 0.5rem 0.5rem;
    padding: 1.5rem;
  }
}

/* 480px 以下：超小屏微调 */
@media (max-width: 480px) {
  .panel-heading {
    padding: 0.75rem;
  }

  .panel-heading h3 {
    font-size: 0.95rem;
  }

  .manual-status-note {
    font-size: 0.75rem;
  }

  .operation-log-item {
    padding: 0.6rem 0.75rem;
    gap: 0.2rem;
  }

  .operation-log-item__meta {
    gap: 0.2rem 0.5rem;
  }

  .operation-log-item time {
    font-size: 0.7rem;
  }

  .operation-log-item__meta span:nth-of-type(1) {
    font-size: 0.8rem;
  }

  .operation-log-item__meta span:nth-of-type(2) {
    font-size: 0.65rem;
  }

  .operation-log-item strong {
    font-size: 0.85rem;
  }

  .operation-log-item .mono {
    font-size: 0.6rem;
  }
}
</style>